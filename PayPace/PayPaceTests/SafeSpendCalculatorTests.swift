import XCTest
@testable import PayPace

final class SafeSpendCalculatorTests: XCTestCase {
    func testSafeSpendFormula() {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        let payday = calendar.date(byAdding: .day, value: 15, to: start)!

        let cycle = PayCycle(
            schedule: .everyTwoWeeks,
            startDate: start,
            nextPayday: payday,
            currentBalance: 3_000,
            savingsGoal: 200,
            emergencyBuffer: 100,
            spendingBuffer: 50,
            bills: [
                Bill(name: "Rent", amount: 1_200, dueDate: payday.addingTimeInterval(-86400 * 10)),
                Bill(name: "Internet", amount: 65, dueDate: payday.addingTimeInterval(-86400 * 5))
            ],
            expenses: [
                DailyExpense(name: "Coffee", amount: 18)
            ]
        )

        let snap = SafeSpendCalculator.snapshot(for: cycle)

        // 3000 - 1265 - 350 - 18 = 1367
        XCTAssertEqual(snap.remainingUntilPayday, 1_367)
        XCTAssertEqual(snap.daysUntilPayday, 15)
        XCTAssertEqual(snap.safeToSpendToday, Decimal(1_367) / 15)
    }

    func testAddingExpenseLowersSafeToday() {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        let payday = calendar.date(byAdding: .day, value: 10, to: start)!

        var cycle = PayCycle(
            startDate: start,
            nextPayday: payday,
            currentBalance: 1_000,
            bills: [],
            expenses: []
        )

        let before = SafeSpendCalculator.snapshot(for: cycle).safeToSpendToday
        cycle.expenses.append(DailyExpense(name: "Coffee", amount: 18))
        let after = SafeSpendCalculator.snapshot(for: cycle).safeToSpendToday

        XCTAssertTrue(after < before)
    }

    func testSmokeHelper() {
        XCTAssertTrue(PayPaceTests.runSmokeChecks())
    }
}
