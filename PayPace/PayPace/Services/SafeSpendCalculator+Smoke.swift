import Foundation

enum PayPaceTests {
    /// Lightweight calculator checks runnable without XCTest host when needed.
    static func runSmokeChecks() -> Bool {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        guard let payday = calendar.date(byAdding: .day, value: 15, to: start) else { return false }

        let cycle = PayCycle(
            schedule: .everyTwoWeeks,
            startDate: start,
            nextPayday: payday,
            currentBalance: 3000,
            expectedPaycheck: 4200,
            savingsGoal: 200,
            emergencyBuffer: 100,
            spendingBuffer: 50,
            bills: [
                Bill(name: "Rent", amount: 1200, dueDate: start.addingTimeInterval(86400 * 3), category: .rent),
                Bill(name: "Internet", amount: 65, dueDate: start.addingTimeInterval(86400 * 6), category: .utilities)
            ],
            expenses: [
                DailyExpense(name: "Coffee", amount: 18)
            ]
        )

        let snap = SafeSpendCalculator.snapshot(for: cycle)
        // 3000 - 1265 - 350 - 18 = 1367 remaining
        let expectedRemaining: Decimal = 1367
        guard snap.remainingUntilPayday == expectedRemaining else { return false }
        guard snap.daysUntilPayday == 15 else { return false }
        // 1367 / 15
        let expectedToday = expectedRemaining / 15
        return snap.safeToSpendToday == expectedToday
    }
}
