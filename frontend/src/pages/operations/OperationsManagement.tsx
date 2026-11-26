import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  HeartHandshake, 
  DollarSign, 
  Plus, 
  Search, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Gift, 
  RefreshCw,
  Phone,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface Employee {
  id: number;
  user_id: number | null;
  employee_code: string;
  full_name: string;
  phone: string;
  position: string;
  base_salary: number;
  status: string;
  hire_date: string;
}

interface Attendance {
  id: number;
  employee_id: number;
  employee_name: string;
  position: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  shift: string;
  status: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  total_spending: number;
  loyalty_points: number;
  created_at: string;
}

interface Expense {
  id: number;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  recorder_name: string;
}

interface ExpenseSummary {
  total_expenses: number;
  by_category: Record<string, number>;
}

export const OperationsManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const isOwner = currentUser?.role === 'OWNER';

  const [activeTab, setActiveTab] = useState<'employees' | 'customers' | 'expenses'>('employees');
  const [loading, setLoading] = useState<boolean>(true);

  // Employees & Attendance
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [showAddEmpModal, setShowAddEmpModal] = useState<boolean>(false);
  const [newEmpCode, setNewEmpCode] = useState<string>('');
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpPhone, setNewEmpPhone] = useState<string>('');
  const [newEmpPos, setNewEmpPos] = useState<string>('WAITER');
  const [newEmpSalary, setNewEmpSalary] = useState<string>('300000');
  const [newEmpUsername, setNewEmpUsername] = useState<string>('');
  const [newEmpPassword, setNewEmpPassword] = useState<string>('');

  // Customers CRM
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showAddCustModal, setShowAddCustModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustNotes, setNewCustNotes] = useState<string>('');

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [showAddExpModal, setShowAddExpModal] = useState<boolean>(false);
  const [newExpCat, setNewExpCat] = useState<string>('Electricity');
  const [newExpAmount, setNewExpAmount] = useState<string>('');
  const [newExpDesc, setNewExpDesc] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'employees') {
        const [empRes, attRes] = await Promise.all([
          apiRequest<Employee[]>('/api/v1/operations/employees'),
          apiRequest<Attendance[]>('/api/v1/operations/employees/attendance/today')
        ]);
        setEmployees(empRes);
        setAttendance(attRes);
      } else if (activeTab === 'customers') {
        const res = await apiRequest<Customer[]>('/api/v1/operations/customers');
        setCustomers(res);
      } else if (activeTab === 'expenses') {
        const [expList, expSum] = await Promise.all([
          apiRequest<Expense[]>('/api/v1/operations/expenses'),
          apiRequest<ExpenseSummary>('/api/v1/operations/expenses/summary')
        ]);
        setExpenses(expList);
        setExpenseSummary(expSum);
      }
    } catch (err) {
      console.error('Failed to load operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMMK = (val: number) => `${Math.round(val).toLocaleString()} Ks`;

  const handleCheckIn = async (employeeId: number) => {
    try {
      await apiRequest('/api/v1/operations/employees/check-in', {
        method: 'POST',
        body: JSON.stringify({ employee_id: employeeId, shift: 'MORNING' })
      });
      fetchData();
    } catch (err: any) {
      alert(`Check-in failed: ${err.message || 'Error'}`);
    }
  };

  const handleCheckOut = async (employeeId: number) => {
    try {
      await apiRequest('/api/v1/operations/employees/check-out', {
        method: 'POST',
        body: JSON.stringify({ employee_id: employeeId })
      });
      fetchData();
    } catch (err: any) {
      alert(`Check-out failed: ${err.message || 'Error'}`);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/operations/employees', {
        method: 'POST',
        body: JSON.stringify({
          employee_code: newEmpCode,
          full_name: newEmpName,
          phone: newEmpPhone,
          position: newEmpPos,
          base_salary: parseFloat(newEmpSalary) || 0,
          username: newEmpUsername.trim() || undefined,
          password: newEmpPassword.trim() || undefined,
          role_name: newEmpPos
        })
      });

      setShowAddEmpModal(false);
      setNewEmpCode('');
      setNewEmpName('');
      setNewEmpPhone('');
      setNewEmpUsername('');
      setNewEmpPassword('');
      fetchData();
    } catch (err: any) {
      alert(`Failed to add employee: ${err.message || 'Error'}`);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/operations/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: newCustName,
          phone: newCustPhone,
          notes: newCustNotes
        })
      });

      setShowAddCustModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustNotes('');
      fetchData();
    } catch (err: any) {
      alert(`Failed to register customer: ${err.message || 'Error'}`);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/operations/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: newExpCat,
          amount: parseFloat(newExpAmount) || 0,
          description: newExpDesc
        })
      });

      setShowAddExpModal(false);
      setNewExpAmount('');
      setNewExpDesc('');
      fetchData();
    } catch (err: any) {
      alert(`Failed to record expense: ${err.message || 'Error'}`);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <span>Staff Administration, Customer CRM & Expense Control</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Employee shift timecards, confidential payroll records, customer loyalty points, and overhead expenses.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        {[
          { id: 'employees', label: 'Staff & Shift Attendance', icon: UserCheck },
          { id: 'customers', label: 'Customer Loyalty & CRM', icon: HeartHandshake },
          { id: 'expenses', label: 'Operating Overhead Expenses', icon: DollarSign },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
                isActive
                  ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEES & ATTENDANCE */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Restaurant Workforce Roster</h3>
              <p className="text-xs text-zinc-400">Manage positions, access logins, and record attendance timestamps</p>
            </div>

            {isOwner && (
              <button
                onClick={() => setShowAddEmpModal(true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            )}
          </div>

          {/* Employee Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {employees.map((emp) => {
              const todayAtt = attendance.find(a => a.employee_id === emp.id);
              const isCheckedIn = !!todayAtt?.check_in;
              const isCheckedOut = !!todayAtt?.check_out;

              return (
                <div key={emp.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-700/60">
                          {emp.employee_code}
                        </span>
                        <h4 className="font-bold text-sm text-zinc-100 mt-1">{emp.full_name}</h4>
                        <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 text-zinc-500" />
                          <span>{emp.position}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isCheckedIn && !isCheckedOut
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60 animate-pulse'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {isCheckedIn && !isCheckedOut ? 'ON DUTY' : isCheckedOut ? 'OFF DUTY' : 'NOT CHECKED IN'}
                      </span>
                    </div>

                    <div className="mt-3 text-xs space-y-1 text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{emp.phone || 'No phone'}</span>
                      </div>

                      {isOwner && (
                        <div className="flex justify-between pt-1 border-t border-zinc-800 font-semibold text-zinc-300">
                          <span>Base Salary:</span>
                          <span className="text-emerald-400">{formatMMK(emp.base_salary)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex gap-2">
                    {!isCheckedIn ? (
                      <button
                        onClick={() => handleCheckIn(emp.id)}
                        className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition"
                      >
                        Check In
                      </button>
                    ) : !isCheckedOut ? (
                      <button
                        onClick={() => handleCheckOut(emp.id)}
                        className="w-full py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition"
                      >
                        Check Out
                      </button>
                    ) : (
                      <span className="w-full py-1.5 text-center text-xs text-zinc-500 bg-zinc-950 rounded-lg">
                        Shift Finished
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today's Attendance Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Today's Shift Attendance Logs</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Position</th>
                    <th className="py-2 px-3">Shift</th>
                    <th className="py-2 px-3">Check-In Time</th>
                    <th className="py-2 px-3">Check-Out Time</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-zinc-800/40">
                      <td className="py-2 px-3 font-semibold text-zinc-100">{att.employee_name}</td>
                      <td className="py-2 px-3">{att.position}</td>
                      <td className="py-2 px-3 font-medium text-amber-400">{att.shift}</td>
                      <td className="py-2 px-3">{att.check_in ? new Date(att.check_in).toLocaleTimeString() : '-'}</td>
                      <td className="py-2 px-3">{att.check_out ? new Date(att.check_out).toLocaleTimeString() : 'In Progress'}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMERS & LOYALTY */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by customer phone or name..."
                className="bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 w-64"
              />
            </div>

            <button
              onClick={() => setShowAddCustModal(true)}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Register Customer</span>
            </button>
          </div>

          {/* Customers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredCustomers.map((cust) => (
              <div key={cust.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100">{cust.name}</h4>
                    <p className="text-xs text-amber-400 font-semibold">{cust.phone}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Loyalty Points</span>
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1 justify-end">
                      <Gift className="w-3.5 h-3.5" />
                      {cust.loyalty_points} Pts
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Lifetime Spending:</span>
                    <span className="text-emerald-400 font-bold">{formatMMK(cust.total_spending)}</span>
                  </div>
                  {cust.notes && (
                    <div className="text-[11px] text-zinc-400 italic bg-zinc-950 p-2 rounded-lg border border-zinc-800 mt-2">
                      "{cust.notes}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OPERATING EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Restaurant Overhead & Operating Costs</h3>
              <p className="text-xs text-zinc-400">Track rent, utility bills, maintenance, and kitchen operational expenses</p>
            </div>

            <button
              onClick={() => setShowAddExpModal(true)}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <span className="text-[11px] text-zinc-400">Total Operating Expenses</span>
              <div className="text-base font-bold text-red-400 mt-1">
                {formatMMK(expenseSummary?.total_expenses || 0)}
              </div>
            </div>

            {expenseSummary?.by_category && Object.entries(expenseSummary.by_category).slice(0, 3).map(([cat, amount]) => (
              <div key={cat} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <span className="text-[11px] text-zinc-400">{cat}</span>
                <div className="text-base font-bold text-zinc-200 mt-1">
                  {formatMMK(amount)}
                </div>
              </div>
            ))}
          </div>

          {/* Expenses Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 text-zinc-400">{new Date(exp.expense_date).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 font-semibold text-amber-400">{exp.category}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-400">-{formatMMK(exp.amount)}</td>
                      <td className="py-2.5 px-3 text-zinc-300">{exp.description || '-'}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{exp.recorder_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-3">Add Restaurant Staff Member</h3>

            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={newEmpCode}
                    onChange={(e) => setNewEmpCode(e.target.value)}
                    placeholder="e.g. EMP-010"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Position / Role</label>
                  <select
                    value={newEmpPos}
                    onChange={(e) => setNewEmpPos(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="WAITER">WAITER</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="KITCHEN STAFF">KITCHEN STAFF</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="e.g. Ma Hnin Nwe"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="+95 9 ..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Base Salary (Ks)</label>
                  <input
                    type="number"
                    value={newEmpSalary}
                    onChange={(e) => setNewEmpSalary(e.target.value)}
                    placeholder="e.g. 350000"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <p className="text-[11px] text-zinc-400 mb-2">Optional System Account Login Credentials:</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newEmpUsername}
                    onChange={(e) => setNewEmpUsername(e.target.value)}
                    placeholder="Login username"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  />
                  <input
                    type="password"
                    value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    placeholder="Login password"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shadow"
                >
                  Register Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-3">Register New Customer</h3>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. U Min Thant"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+95 9 ..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Dining Preferences & Notes</label>
                <textarea
                  rows={2}
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  placeholder="e.g. Likes outdoor seating, seafood lover"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shadow"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-3">Record Business Expense</h3>

            <form onSubmit={handleRecordExpense} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Expense Category</label>
                <select
                  value={newExpCat}
                  onChange={(e) => setNewExpCat(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                >
                  {['Electricity', 'Rent', 'Water', 'Internet', 'Salaries', 'Maintenance', 'Transportation', 'Food Ingredients', 'Miscellaneous'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Amount (Ks)</label>
                <input
                  type="number"
                  required
                  value={newExpAmount}
                  onChange={(e) => setNewExpAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Description / Receipt Ref</label>
                <input
                  type="text"
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  placeholder="e.g. Dining room lightbulb replacements"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddExpModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shadow"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
