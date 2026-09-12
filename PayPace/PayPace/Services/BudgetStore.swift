import Foundation
import Observation

@Observable
@MainActor
final class BudgetStore {
    private let persistence: PersistenceService
    private let notifications: NotificationService

    private(set) var store: AppStore
    var path: [AppRoute] = []

    init(
        persistence: PersistenceService = .shared,
        notifications: NotificationService = .shared
    ) {
        self.persistence = persistence
        self.notifications = notifications
        self.store = persistence.load()
    }

    var settings: AppSettings {
        store.settings
    }

    var activeCycle: PayCycle? {
        store.activeCycle
    }

    var snapshot: SafeSpendSnapshot {
        guard let cycle = activeCycle else { return .empty }
        return SafeSpendCalculator.snapshot(for: cycle)
    }

    var pastCycles: [PayCycle] {
        store.cycles
            .filter { !$0.isActive }
            .sorted { $0.nextPayday > $1.nextPayday }
    }

    /// Free plan: one active cycle. Premium: unlimited.
    var canStartNewCycle: Bool {
        settings.isPremium || !store.cycles.contains(where: \.isActive)
    }

    var freeCycleLimitReached: Bool {
        !settings.isPremium && store.cycles.contains(where: \.isActive)
    }

    func completeOnboarding(with cycle: PayCycle) {
        var next = store
        next.settings.hasCompletedOnboarding = true
        next.cycles = [cycle]
        commit(next)
        Task { await refreshNotifications() }
    }

    func updateSettings(_ mutate: (inout AppSettings) -> Void) {
        var next = store
        mutate(&next.settings)
        commit(next)
        Task { await refreshNotifications() }
    }

    func updateActiveCycle(_ mutate: (inout PayCycle) -> Void) {
        guard var cycle = activeCycle else { return }
        mutate(&cycle)
        var next = store
        next.upsert(cycle)
        commit(next)
        Task { await refreshNotifications() }
    }

    func addBill(_ bill: Bill) {
        updateActiveCycle { $0.bills.append(bill) }
    }

    func updateBill(_ bill: Bill) {
        updateActiveCycle { cycle in
            if let index = cycle.bills.firstIndex(where: { $0.id == bill.id }) {
                cycle.bills[index] = bill
            }
        }
    }

    func deleteBill(id: UUID) {
        updateActiveCycle { $0.bills.removeAll { $0.id == id } }
    }

    func addExpense(_ expense: DailyExpense) {
        updateActiveCycle { $0.expenses.insert(expense, at: 0) }
    }

    func deleteExpense(id: UUID) {
        updateActiveCycle { $0.expenses.removeAll { $0.id == id } }
    }

    func replaceActiveCycle(with cycle: PayCycle) {
        var next = store
        if !settings.isPremium {
            next.cycles = next.cycles.map { var c = $0; c.isActive = false; return c }
            var active = cycle
            active.isActive = true
            next.cycles = [active]
        } else {
            next.cycles = next.cycles.map { var c = $0; c.isActive = false; return c }
            var active = cycle
            active.isActive = true
            next.upsert(active)
        }
        next.settings.hasCompletedOnboarding = true
        commit(next)
        Task { await refreshNotifications() }
    }

    func archiveActiveAndStart(_ cycle: PayCycle) {
        guard settings.isPremium || !freeCycleLimitReached else { return }
        var next = store
        next.cycles = next.cycles.map { var c = $0; c.isActive = false; return c }
        var fresh = cycle
        fresh.isActive = true
        next.upsert(fresh)
        commit(next)
        Task { await refreshNotifications() }
    }

    func setPremium(_ enabled: Bool) {
        updateSettings { $0.isPremium = enabled }
    }

    func resetAllData() {
        store = .empty
        persistence.save(store)
        path = []
    }

    func refreshNotifications() async {
        await notifications.reschedule(store: store, snapshot: snapshot)
    }

    private func commit(_ next: AppStore) {
        store = next
        persistence.save(next)
    }
}

enum AppRoute: Hashable {
    case addExpense
    case upcomingBills
    case payCycleDetails
    case history
    case settings
    case editBill(Bill)
    case addBill
}
