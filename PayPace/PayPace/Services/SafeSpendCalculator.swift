import Foundation

enum SafeSpendCalculator {
    /// Current balance − mandatory expenses − savings − emergency buffer − spending buffer − already spent
    /// = money available until payday
    static func snapshot(for cycle: PayCycle, now: Date = .now) -> SafeSpendSnapshot {
        let unpaidBills = cycle.unpaidBillsTotal
        let spent = cycle.spentThisCycle
        let reserved = cycle.savingsGoal + cycle.emergencyBuffer + cycle.spendingBuffer
        let remaining = cycle.currentBalance - unpaidBills - reserved - spent

        let daysUntil = max(cycle.daysUntilPayday, 0)
        let divisor = max(daysUntil, 1)
        let safeToday: Decimal
        if daysUntil == 0 {
            safeToday = max(remaining, 0)
        } else {
            safeToday = max(remaining, 0) / Decimal(divisor)
        }

        let projectedShortfall = projectedShortfallDays(
            remaining: remaining,
            spent: spent,
            daysElapsed: max(cycle.daysElapsed, 1),
            daysUntil: daysUntil
        )

        return SafeSpendSnapshot(
            remainingUntilPayday: remaining,
            safeToSpendToday: safeToday,
            daysUntilPayday: daysUntil,
            totalDaysInCycle: cycle.totalDaysInCycle,
            cycleProgress: min(max(cycle.cycleProgress, 0), 1),
            unpaidBillsTotal: unpaidBills,
            spentThisCycle: spent,
            reservedTotal: reserved,
            isAtRisk: remaining < 0 || projectedShortfall != nil,
            projectedShortfallDays: projectedShortfall
        )
    }

    /// If average daily spend continues, estimate how many days before payday funds run out.
    private static func projectedShortfallDays(
        remaining: Decimal,
        spent: Decimal,
        daysElapsed: Int,
        daysUntil: Int
    ) -> Int? {
        guard daysUntil > 0, spent > 0, remaining > 0 else {
            if remaining < 0 { return daysUntil }
            return nil
        }

        let averageDaily = spent / Decimal(daysElapsed)
        guard averageDaily > 0 else { return nil }

        let daysAffordable = remaining / averageDaily
        let affordable = NSDecimalNumber(decimal: daysAffordable).doubleValue
        if affordable < Double(daysUntil) {
            let shortfall = daysUntil - Int(affordable.rounded(.down))
            return max(shortfall, 1)
        }
        return nil
    }
}
