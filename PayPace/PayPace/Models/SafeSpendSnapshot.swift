import Foundation

struct SafeSpendSnapshot: Equatable {
    let remainingUntilPayday: Decimal
    let safeToSpendToday: Decimal
    let daysUntilPayday: Int
    let totalDaysInCycle: Int
    let cycleProgress: Double
    let unpaidBillsTotal: Decimal
    let spentThisCycle: Decimal
    let reservedTotal: Decimal
    let isAtRisk: Bool
    let projectedShortfallDays: Int?

    static let empty = SafeSpendSnapshot(
        remainingUntilPayday: 0,
        safeToSpendToday: 0,
        daysUntilPayday: 0,
        totalDaysInCycle: 1,
        cycleProgress: 0,
        unpaidBillsTotal: 0,
        spentThisCycle: 0,
        reservedTotal: 0,
        isAtRisk: false,
        projectedShortfallDays: nil
    )
}
