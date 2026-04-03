import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Users, 
  Receipt, 
  ArrowRightLeft, 
  TrendingDown, 
  TrendingUp,
  Wallet,
  History,
  ChevronRight,
  Download,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Member {
  id: string;
  name: string;
  initialBudget: number;
}

interface Expense {
  id: string;
  memberName: string;
  amount: number;
  description: string;
  date: string;
}

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: '박건호', initialBudget: 80000 },
  { id: '2', name: '김윤기', initialBudget: 80000 },
  { id: '3', name: '오성준', initialBudget: 80000 },
  { id: '4', name: '이준현', initialBudget: 80000 },
  { id: '5', name: '박재현', initialBudget: 80000 },
  { id: '6', name: '김도연', initialBudget: 80000 },
  { id: '7', name: '김재홍', initialBudget: 80000 },
  { id: '8', name: '권익환', initialBudget: 80000 },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', memberName: '김윤기', amount: 95570, description: '에셋 구매 1', date: '2026-04-01' },
  { id: 'e2', memberName: '김윤기', amount: 31760, description: '에셋 구매 2', date: '2026-04-01' },
  { id: 'e3', memberName: '이준현', amount: 64740, description: '에셋 구매 3', date: '2026-04-01' },
  { id: 'e4', memberName: '이준현', amount: 23810, description: '에셋 구매 4', date: '2026-04-01' },
  { id: 'e5', memberName: '박재현', amount: 55590, description: '에셋 구매 5', date: '2026-04-01' },
  { id: 'e6', memberName: '김도연', amount: 22410, description: '에셋 구매 6', date: '2026-04-01' },
  { id: 'e7', memberName: '권익환', amount: 49130, description: '에셋 구매 7', date: '2026-04-01' },
];

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [newExpense, setNewExpense] = useState({ memberName: INITIAL_MEMBERS[0].name, amount: '', description: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'settlement'>('dashboard');

  // Calculations
  const memberSpending = useMemo(() => {
    const spending: Record<string, number> = {};
    INITIAL_MEMBERS.forEach(m => spending[m.name] = 0);
    expenses.forEach(e => {
      spending[e.memberName] += e.amount;
    });
    return spending;
  }, [expenses]);

  const totalSpent = useMemo(() => 
    Object.values(memberSpending).reduce((sum: number, val: number) => sum + val, 0)
  , [memberSpending]);

  const totalBudget = useMemo(() => 
    INITIAL_MEMBERS.reduce((sum, m) => sum + m.initialBudget, 0)
  , []);

  const remainingBudget = totalBudget - totalSpent;

  const averageSpent = totalSpent / INITIAL_MEMBERS.length;

  const settlements = useMemo(() => {
    const balances = INITIAL_MEMBERS.map(m => ({
      name: m.name,
      balance: memberSpending[m.name] - averageSpent
    }));

    let debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) }));
    let creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));

    const transactions: Transaction[] = [];

    // 1. 김재홍 특수 처리 (번거로움 극대화: 작은 금액들부터 우선 매칭하여 송금 횟수 증가)
    const jaehongDebtor = debtors.find(d => d.name === '김재홍');
    const jaehongCreditor = creditors.find(c => c.name === '김재홍');

    if (jaehongDebtor) {
      debtors = debtors.filter(d => d.name !== '김재홍');
      // 김재홍(채무자)은 작은 채권자부터 처리하여 여러 명에게 보내게 함
      creditors.sort((a, b) => a.balance - b.balance);
      for (let j = 0; j < creditors.length && jaehongDebtor.balance > 0.01; j++) {
        const amount = Math.min(jaehongDebtor.balance, creditors[j].balance);
        if (amount > 0.01) {
          transactions.push({ from: '김재홍', to: creditors[j].name, amount });
          jaehongDebtor.balance -= amount;
          creditors[j].balance -= amount;
        }
      }
      if (jaehongDebtor.balance > 0.01) debtors.push(jaehongDebtor);
    } else if (jaehongCreditor) {
      creditors = creditors.filter(c => c.name !== '김재홍');
      // 김재홍(채권자)은 작은 채무자들로부터 쪼개서 받게 함
      debtors.sort((a, b) => a.balance - b.balance);
      for (let i = 0; i < debtors.length && jaehongCreditor.balance > 0.01; i++) {
        const amount = Math.min(debtors[i].balance, jaehongCreditor.balance);
        if (amount > 0.01) {
          transactions.push({ from: debtors[i].name, to: '김재홍', amount });
          debtors[i].balance -= amount;
          jaehongCreditor.balance -= amount;
        }
      }
      if (jaehongCreditor.balance > 0.01) creditors.push(jaehongCreditor);
    }

    // 2. 나머지 인원: 최소 송금 적용 (Greedy: 큰 금액끼리 매칭하여 횟수 최소화)
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      if (debtors[i].balance < 0.01) { i++; continue; }
      if (creditors[j].balance < 0.01) { j++; continue; }

      const amount = Math.min(debtors[i].balance, creditors[j].balance);
      transactions.push({ from: debtors[i].name, to: creditors[j].name, amount });
      debtors[i].balance -= amount;
      creditors[j].balance -= amount;
      
      if (debtors[i].balance < 0.01) i++;
      if (creditors[j].balance < 0.01) j++;
    }

    return transactions;
  }, [memberSpending, averageSpent]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || isNaN(Number(newExpense.amount))) return;

    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      memberName: newExpense.memberName,
      amount: Number(newExpense.amount),
      description: newExpense.description || '추가 지출',
      date: new Date().toISOString().split('T')[0]
    };

    setExpenses([...expenses, expense]);
    setNewExpense({ ...newExpense, amount: '', description: '' });
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const formatKRW = (amount: number) => 
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  const handleDownload = () => {
    const dateStr = new Date().toLocaleDateString('ko-KR');
    let content = `[팀 프로젝트 정산 리포트 - ${dateStr}]\n\n`;
    
    content += `■ 요약\n`;
    content += `- 총 예산: ${formatKRW(totalBudget)}\n`;
    content += `- 총 지출액: ${formatKRW(totalSpent)}\n`;
    content += `- 남은 총 금액: ${formatKRW(remainingBudget)}\n`;
    content += `- 1인당 분담금: ${formatKRW(averageSpent)}\n\n`;

    content += `■ 멤버별 지출 현황\n`;
    INITIAL_MEMBERS.forEach(m => {
      const spent = memberSpending[m.name];
      const diff = spent - averageSpent;
      content += `- ${m.name}: ${formatKRW(spent)} (정산: ${diff > 0 ? '+' : ''}${formatKRW(diff)})\n`;
    });
    content += `\n`;

    content += `■ 상세 지출 내역\n`;
    expenses.forEach((e, idx) => {
      content += `${idx + 1}. [${e.date}] ${e.memberName}: ${formatKRW(e.amount)} (${e.description})\n`;
    });
    content += `\n`;

    content += `■ 송금 가이드\n`;
    if (settlements.length > 0) {
      settlements.forEach((t, idx) => {
        content += `${idx + 1}. ${t.from} → ${t.to}: ${formatKRW(t.amount)}\n`;
      });
    } else {
      content += `정산할 내역이 없습니다.\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `정산리포트_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Calculator className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">팀 프로젝트 정산</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              리포트 다운로드
            </button>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded hidden sm:block">
              8인 팀 프로젝트
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-200/50 rounded-xl">
          {(['dashboard', 'expenses', 'settlement'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'dashboard' && '대시보드'}
              {tab === 'expenses' && '지출 내역'}
              {tab === 'settlement' && '정산 결과'}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Receipt className="text-indigo-600 w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">총 지출액</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatKRW(totalSpent)}</div>
                <div className="mt-2 text-xs text-slate-500">
                  전체 팀원이 공동 지출한 금액
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Coins className="text-emerald-600 w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">남은 총 금액</span>
                </div>
                <div className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatKRW(remainingBudget)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  총 예산({formatKRW(totalBudget)}) - 총 지출
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Users className="text-amber-600 w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">1인당 분담금</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatKRW(averageSpent)}</div>
                <div className="mt-2 text-xs text-slate-500">
                  총 지출액 / 8명
                </div>
              </div>
            </div>

            {/* Member Status List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  멤버별 지출 현황
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {INITIAL_MEMBERS.map((member) => {
                  const spent = memberSpending[member.name];
                  const diff = spent - averageSpent;
                  const isOwed = diff > 0;

                  return (
                    <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                          {member.name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{member.name}</div>
                          <div className="text-xs text-slate-500">지출: {formatKRW(spent)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${isOwed ? 'text-emerald-600' : diff < -0.01 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {diff === 0 ? '정산 완료' : isOwed ? `+${formatKRW(diff)} 받기` : `${formatKRW(Math.abs(diff))} 보내기`}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          {isOwed ? 'Creditor' : diff < -0.01 ? 'Debtor' : 'Balanced'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'expenses' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Add Expense Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                지출 내역 추가
              </h3>
              <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 ml-1">지출자</label>
                  <select 
                    value={newExpense.memberName}
                    onChange={(e) => setNewExpense({ ...newExpense, memberName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {INITIAL_MEMBERS.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 ml-1">금액 (원)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-xs font-medium text-slate-500 ml-1">내용</label>
                  <input 
                    type="text"
                    placeholder="지출 항목"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    추가하기
                  </button>
                </div>
              </form>
            </div>

            {/* Expense List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  전체 지출 로그
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">날짜</th>
                      <th className="px-6 py-3">지출자</th>
                      <th className="px-6 py-3">내용</th>
                      <th className="px-6 py-3 text-right">금액</th>
                      <th className="px-6 py-3 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                      {expenses.slice().reverse().map((expense) => (
                        <motion.tr 
                          key={expense.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-slate-400 text-xs">{expense.date}</td>
                          <td className="px-6 py-4 font-medium">{expense.memberName}</td>
                          <td className="px-6 py-4 text-slate-600">{expense.description}</td>
                          <td className="px-6 py-4 text-right font-semibold">{formatKRW(expense.amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => removeExpense(expense.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          등록된 지출 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settlement' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Settlement Logic Explanation */}
            <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <ArrowRightLeft className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">정산 프로세스</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">
                    모든 지출을 합산하여 8명으로 나눈 후, 평균보다 적게 쓴 사람이 많이 쓴 사람에게 차액을 송금하는 방식입니다. 
                    최소한의 송금 횟수로 정산이 완료되도록 계산되었습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  송금 가이드
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {settlements.length > 0 ? (
                  settlements.map((t, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded mb-1">보내는 사람</span>
                          <span className="font-bold text-slate-900">{t.from}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center px-4">
                          <div className="w-full h-px bg-slate-200 relative">
                            <ChevronRight className="absolute -right-1 -top-2 w-4 h-4 text-slate-300" />
                          </div>
                          <span className="text-sm font-bold text-indigo-600 mt-2">{formatKRW(t.amount)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mb-1">받는 사람</span>
                          <span className="font-bold text-slate-900">{t.to}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>정산할 내역이 없습니다. 모든 팀원의 지출이 균등합니다.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Tab Bar (Mobile Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 md:hidden flex justify-between items-center z-20">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-bold">현황</span>
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'expenses' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-bold">지출</span>
        </button>
        <button 
          onClick={() => setActiveTab('settlement')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'settlement' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span className="text-[10px] font-bold">정산</span>
        </button>
      </nav>
    </div>
  );
}
