import SwiftUI

@main
struct PayPaceApp: App {
    @State private var budget = BudgetStore()

    var body: some Scene {
        WindowGroup {
            RootView(budget: budget)
                .preferredColorScheme(.light)
        }
    }
}

struct RootView: View {
    @Bindable var budget: BudgetStore

    var body: some View {
        Group {
            if budget.settings.hasCompletedOnboarding, budget.activeCycle != nil {
                HomeView(budget: budget)
            } else {
                OnboardingFlowView(budget: budget)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: budget.settings.hasCompletedOnboarding)
    }
}
