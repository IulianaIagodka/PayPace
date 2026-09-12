import Foundation

struct PayCycle: Identifiable, Codable, Equatable {
    var id: UUID
    var schedule: PaySchedule
    var startDate: Date
    var nextPayday: Date
    var currentBalance: Decimal
    var expectedPaycheck: Decimal
    var savingsGoal: Decimal
    var emergencyBuffer: Decimal
    var spendingBuffer: Decimal
    var bills: [Bill]
    var expenses: [DailyExpense]
    var isActive: Bool
    var createdAt: Date

    init(
        id: UUID = UUID(),
        schedule: PaySchedule = .monthly,
        startDate: Date = .now,
        nextPayday: Date,
        currentBalance: Decimal = 0,
        expectedPaycheck: Decimal = 0,
        savingsGoal: Decimal = 0,
        emergencyBuffer: Decimal = 0,
        spendingBuffer: Decimal = 0,
        bills: [Bill] = [],
        expenses: [DailyExpense] = [],
        isActive: Bool = true,
        createdAt: Date = .now
    ) {
        self.id = id
        self.schedule = schedule
        self.startDate = Calendar.current.startOfDay(for: startDate)
        self.nextPayday = Calendar.current.startOfDay(for: nextPayday)
        self.currentBalance = currentBalance
        self.expectedPaycheck = expectedPaycheck
        self.savingsGoal = savingsGoal
        self.emergencyBuffer = emergencyBuffer
        self.spendingBuffer = spendingBuffer
        self.bills = bills
        self.expenses = expenses
        self.isActive = isActive
        self.createdAt = createdAt
    }

    var daysUntilPayday: Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let payday = calendar.startOfDay(for: nextPayday)
        let days = calendar.dateComponents([.day], from: today, to: payday).day ?? 0
        return max(days, 0)
    }

    var totalDaysInCycle: Int {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: startDate)
        let payday = calendar.startOfDay(for: nextPayday)
        let days = calendar.dateComponents([.day], from: start, to: payday).day ?? 1
        return max(days, 1)
    }

    var daysElapsed: Int {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: startDate)
        let today = calendar.startOfDay(for: .now)
        let days = calendar.dateComponents([.day], from: start, to: today).day ?? 0
        return min(max(days, 0), totalDaysInCycle)
    }

    var cycleProgress: Double {
        Double(daysElapsed) / Double(totalDaysInCycle)
    }

    var unpaidBillsTotal: Decimal {
        bills.filter { !$0.isPaid }.reduce(0) { $0 + $1.amount }
    }

    var spentThisCycle: Decimal {
        expenses.reduce(0) { $0 + $1.amount }
    }

    var upcomingBills: [Bill] {
        bills
            .filter { !$0.isPaid }
            .sorted { $0.dueDate < $1.dueDate }
    }
}
