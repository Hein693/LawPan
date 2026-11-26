from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.websocket import manager
from app.models.entities import KitchenStation, KitchenTicket, OrderItem, Order, User
from app.schemas.kitchen import StationCreate, StationOut, KitchenTicketOut, TicketStatusUpdate
from app.api.deps import get_current_active_user, require_roles

router = APIRouter(prefix="/kitchen", tags=["Kitchen Display System (KDS)"])

@router.get("/stations", response_model=List[StationOut])
def list_stations(db: Session = Depends(get_db)):
    stations = db.query(KitchenStation).filter(KitchenStation.is_active == True).all()
    return stations

@router.post("/stations", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def create_station(
    data: StationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    existing = db.query(KitchenStation).filter(KitchenStation.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Station code already exists")
    
    st = KitchenStation(
        code=data.code,
        name_en=data.name_en,
        name_mm=data.name_mm,
        is_active=data.is_active
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return st

@router.get("/tickets", response_model=List[KitchenTicketOut])
def list_kitchen_tickets(
    station: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(KitchenTicket)
    if station and station != "ALL":
        query = query.filter(KitchenTicket.station_code == station)
    if status_filter:
        query = query.filter(KitchenTicket.status == status_filter)
    else:
        # By default exclude served/archived tickets
        query = query.filter(KitchenTicket.status.in_(["PENDING", "ACCEPTED", "PREPARING", "READY"]))

    tickets = query.order_by(KitchenTicket.created_at.asc()).all()

    now = datetime.now(timezone.utc)
    results = []
    for t in tickets:
        order = db.query(Order).filter(Order.id == t.order_id).first()
        order_item = db.query(OrderItem).filter(OrderItem.id == t.order_item_id).first()

        # Calculate elapsed preparation minutes
        elapsed = 0
        if t.created_at:
            created_tz = t.created_at.replace(tzinfo=timezone.utc) if t.created_at.tzinfo is None else t.created_at
            elapsed = int((now - created_tz).total_seconds() / 60)

        results.append(KitchenTicketOut(
            id=t.id,
            order_id=t.order_id,
            order_number=order.order_number if order else "",
            table_number=order.table.table_number if order and order.table else "Table #?",
            waiter_name=order.waiter.full_name if order and order.waiter else "Server",
            order_item_id=t.order_item_id,
            item_name_en=order_item.name_en if order_item else "",
            item_name_mm=order_item.name_mm if order_item else "",
            quantity=order_item.quantity if order_item else 1,
            special_instructions=order_item.special_instructions if order_item else None,
            station_code=t.station_code,
            status=t.status,
            started_at=t.started_at,
            completed_at=t.completed_at,
            created_at=t.created_at,
            elapsed_minutes=elapsed
        ))
    return results

@router.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ticket = db.query(KitchenTicket).filter(KitchenTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Kitchen ticket not found")

    allowed_statuses = ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"]
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {allowed_statuses}")

    now = datetime.now(timezone.utc)
    ticket.status = payload.status
    if payload.status == "PREPARING" and not ticket.started_at:
        ticket.started_at = now
    elif payload.status == "READY":
        ticket.completed_at = now

    # Also update associated order item status
    if ticket.order_item:
        ticket.order_item.status = payload.status

    db.commit()

    # Real-time WebSocket Broadcast to KDS, Waiter & Cashier
    await manager.broadcast({
        "type": "KITCHEN_TICKET_UPDATED",
        "ticket_id": ticket.id,
        "order_id": ticket.order_id,
        "station": ticket.station_code,
        "status": ticket.status
    })

    return {
        "id": ticket.id,
        "order_id": ticket.order_id,
        "status": ticket.status,
        "started_at": ticket.started_at,
        "completed_at": ticket.completed_at
    }
