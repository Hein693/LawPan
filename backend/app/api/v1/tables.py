from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.websocket import manager
from app.models.entities import (
    RestaurantTable, Order, Reservation, User, AuditLog
)
from app.schemas.table import (
    TableCreate, TableUpdate, TableStatusUpdate, TableOut,
    TableTransferRequest, TableMergeRequest,
    ReservationCreate, ReservationOut
)
from app.api.deps import get_current_active_user, require_roles

router = APIRouter(prefix="/tables", tags=["Tables & Floor Plan"])

# ==================== TABLE CRUD & MONITORING ====================

@router.get("", response_model=List[TableOut])
def list_tables(
    section: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RestaurantTable)
    if section:
        query = query.filter(RestaurantTable.section == section)
    if status_filter:
        query = query.filter(RestaurantTable.status == status_filter)
    
    tables = query.order_by(RestaurantTable.id.asc()).all()
    results = []
    for t in tables:
        order_num = None
        order_total = None
        waiter_name = None

        if t.current_order_id:
            ord = db.query(Order).filter(Order.id == t.current_order_id).first()
            if ord and ord.status != "COMPLETED" and ord.status != "CANCELLED":
                order_num = ord.order_number
                order_total = ord.total_amount
                waiter_name = ord.waiter.full_name if ord.waiter else "Server"
            else:
                # Disconnect stale order if completed
                t.current_order_id = None
                if t.status == "OCCUPIED":
                    t.status = "CLEANING"
                db.commit()

        results.append(TableOut(
            id=t.id,
            table_number=t.table_number,
            capacity=t.capacity,
            section=t.section,
            status=t.status,
            current_order_id=t.current_order_id,
            active_order_number=order_num,
            active_order_total=order_total,
            active_waiter_name=waiter_name
        ))
    return results

@router.post("", response_model=TableOut, status_code=status.HTTP_201_CREATED)
def create_table(
    data: TableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    existing = db.query(RestaurantTable).filter(RestaurantTable.table_number == data.table_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Table number '{data.table_number}' already exists")

    table = RestaurantTable(
        table_number=data.table_number,
        capacity=data.capacity,
        section=data.section or "Main Dining Hall",
        status=data.status or "AVAILABLE"
    )
    db.add(table)
    db.commit()
    db.refresh(table)

    return TableOut(
        id=table.id,
        table_number=table.table_number,
        capacity=table.capacity,
        section=table.section,
        status=table.status
    )

@router.put("/{table_id}", response_model=TableOut)
def update_table(
    table_id: int,
    data: TableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    if data.table_number is not None:
        table.table_number = data.table_number
    if data.capacity is not None:
        table.capacity = data.capacity
    if data.section is not None:
        table.section = data.section
    if data.status is not None:
        table.status = data.status

    db.commit()
    db.refresh(table)

    return TableOut(
        id=table.id,
        table_number=table.table_number,
        capacity=table.capacity,
        section=table.section,
        status=table.status,
        current_order_id=table.current_order_id
    )

@router.patch("/{table_id}/status")
async def update_table_status(
    table_id: int,
    payload: TableStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    allowed_statuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"]
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {allowed_statuses}")

    table.status = payload.status
    if payload.status == "AVAILABLE":
        table.current_order_id = None

    db.commit()

    await manager.broadcast({
        "type": "TABLE_STATUS_CHANGED",
        "table_id": table.id,
        "table_number": table.table_number,
        "status": table.status
    })

    return {"id": table.id, "table_number": table.table_number, "status": table.status}

@router.delete("/{table_id}")
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    if table.status == "OCCUPIED" or table.current_order_id:
        raise HTTPException(status_code=400, detail="Cannot delete table with active occupied order")

    db.delete(table)
    db.commit()
    return {"message": "Table deleted successfully"}

# ==================== TABLE OPERATIONS (TRANSFER & MERGE) ====================

@router.post("/transfer")
async def transfer_table_order(
    req: TableTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from_table = db.query(RestaurantTable).filter(RestaurantTable.id == req.from_table_id).first()
    to_table = db.query(RestaurantTable).filter(RestaurantTable.id == req.to_table_id).first()

    if not from_table:
        raise HTTPException(status_code=404, detail="Source table not found")
    if not to_table:
        raise HTTPException(status_code=404, detail="Target table not found")

    if not from_table.current_order_id:
        raise HTTPException(status_code=400, detail="Source table has no active order to transfer")

    if to_table.current_order_id:
        active_target_order = db.query(Order).filter(Order.id == to_table.current_order_id).first()
        if active_target_order and active_target_order.status not in ["COMPLETED", "CANCELLED"]:
            raise HTTPException(status_code=400, detail=f"Target table '{to_table.table_number}' is already occupied with another order")
        else:
            to_table.current_order_id = None
            to_table.status = "AVAILABLE"

    # Transfer active order
    order_id = from_table.current_order_id
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Active order not found")

    order.table_id = to_table.id
    to_table.status = "OCCUPIED"
    to_table.current_order_id = order.id

    from_table.status = "CLEANING"
    from_table.current_order_id = None

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="TRANSFER_TABLE",
        entity="ORDER",
        entity_id=str(order.id),
        details=f"Transferred order {order.order_number} from {from_table.table_number} to {to_table.table_number}",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()

    await manager.broadcast({
        "type": "ORDER_TRANSFERRED",
        "order_id": order.id,
        "from_table": from_table.table_number,
        "to_table": to_table.table_number
    })

    return {
        "message": f"Order {order.order_number} successfully transferred from {from_table.table_number} to {to_table.table_number}",
        "order_id": order.id,
        "to_table": to_table.table_number
    }

@router.post("/merge")
async def merge_tables(
    req: TableMergeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "WAITER"))
):
    primary = db.query(RestaurantTable).filter(RestaurantTable.id == req.primary_table_id).first()
    secondary = db.query(RestaurantTable).filter(RestaurantTable.id == req.secondary_table_id).first()

    if not primary or not secondary:
        raise HTTPException(status_code=404, detail="One or both tables not found")

    secondary.status = "OCCUPIED"
    secondary.current_order_id = primary.current_order_id

    db.commit()

    await manager.broadcast({
        "type": "TABLES_MERGED",
        "primary_table": primary.table_number,
        "secondary_table": secondary.table_number
    })

    return {
        "message": f"Tables {primary.table_number} and {secondary.table_number} merged successfully"
    }

# ==================== RESERVATIONS ====================

@router.get("/reservations", response_model=List[ReservationOut])
def list_reservations(db: Session = Depends(get_db)):
    reservations = db.query(Reservation).order_by(Reservation.reservation_time.asc()).all()
    results = []
    for r in reservations:
        results.append(ReservationOut(
            id=r.id,
            table_id=r.table_id,
            table_number=r.table.table_number if r.table else "",
            customer_name=r.customer_name,
            customer_phone=r.customer_phone,
            party_size=r.party_size,
            reservation_time=r.reservation_time,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at
        ))
    return results

@router.post("/reservations", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == data.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    res = Reservation(
        table_id=data.table_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        party_size=data.party_size,
        reservation_time=data.reservation_time,
        status="CONFIRMED",
        notes=data.notes
    )
    db.add(res)
    table.status = "RESERVED"
    db.commit()
    db.refresh(res)

    await manager.broadcast({
        "type": "TABLE_RESERVED",
        "table_number": table.table_number,
        "customer": res.customer_name,
        "time": res.reservation_time.isoformat()
    })

    return ReservationOut(
        id=res.id,
        table_id=res.table_id,
        table_number=table.table_number,
        customer_name=res.customer_name,
        customer_phone=res.customer_phone,
        party_size=res.party_size,
        reservation_time=res.reservation_time,
        status=res.status,
        notes=res.notes,
        created_at=res.created_at
    )
