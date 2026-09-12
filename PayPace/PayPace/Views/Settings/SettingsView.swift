import SwiftUI

struct SettingsView: View {
    @Bindable var budget: BudgetStore
    @State private var showResetConfirm = false

    var body: some View {
        ZStack {
            PayPaceBackground()

            List {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("PayPace")
                            .font(.system(.title2, design: .rounded).weight(.bold))
                        Text("Know exactly what you can spend until payday.")
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundStyle(PayPaceTheme.inkSecondary)
                    }
                    .listRowBackground(Color.white.opacity(0.55))
                }

                Section("Notifications") {
                    Toggle("Enable notifications", isOn: notificationsBinding)
                        .tint(PayPaceTheme.accent)
                    Toggle("Morning safe-to-spend", isOn: morningBinding)
                        .tint(PayPaceTheme.accent)
                        .disabled(!budget.settings.notificationsEnabled)
                    Toggle("Bill reminders", isOn: billBinding)
                        .tint(PayPaceTheme.accent)
                        .disabled(!budget.settings.notificationsEnabled)
                    Toggle("Pace warnings", isOn: paceBinding)
                        .tint(PayPaceTheme.accent)
                        .disabled(!budget.settings.notificationsEnabled)
                }
                .listRowBackground(Color.white.opacity(0.55))

                Section("Currency") {
                    Picker("Currency", selection: currencyBinding) {
                        Text("zł — PLN").tag("PLN")
                        Text("$ — USD").tag("USD")
                        Text("€ — EUR").tag("EUR")
                        Text("£ — GBP").tag("GBP")
                    }
                    .pickerStyle(.menu)
                }
                .listRowBackground(Color.white.opacity(0.55))

                Section("Premium") {
                    if budget.settings.isPremium {
                        Label("Premium active", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(PayPaceTheme.success)
                        Button("Restore free (demo)") {
                            budget.setPremium(false)
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("PayPace Premium")
                                .font(.system(.headline, design: .rounded))
                            Text("Recurring bills, unlimited pay cycles, history, widgets, advanced notifications, and shared household budgets.")
                                .font(.system(.subheadline, design: .rounded))
                                .foregroundStyle(PayPaceTheme.inkSecondary)
                            Text("$2.99/month or $19.99/year")
                                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                                .foregroundStyle(PayPaceTheme.accent)
                        }
                        Button("Upgrade (demo unlock)") {
                            budget.setPremium(true)
                        }
                        .foregroundStyle(PayPaceTheme.accent)
                    }
                }
                .listRowBackground(Color.white.opacity(0.55))

                Section("Free plan includes") {
                    Text("1 active pay cycle · basic bills · daily safe-to-spend")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(PayPaceTheme.inkSecondary)
                }
                .listRowBackground(Color.white.opacity(0.55))

                Section {
                    Button("Reset all data", role: .destructive) {
                        showResetConfirm = true
                    }
                }
                .listRowBackground(Color.white.opacity(0.55))
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Settings")
        .confirmationDialog("Erase all PayPace data?", isPresented: $showResetConfirm, titleVisibility: .visible) {
            Button("Reset", role: .destructive) {
                budget.resetAllData()
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private var notificationsBinding: Binding<Bool> {
        Binding(
            get: { budget.settings.notificationsEnabled },
            set: { value in
                budget.updateSettings { $0.notificationsEnabled = value }
                if value {
                    Task { _ = await NotificationService.shared.requestAuthorizationIfNeeded() }
                }
            }
        )
    }

    private var morningBinding: Binding<Bool> {
        Binding(
            get: { budget.settings.morningReminderEnabled },
            set: { value in budget.updateSettings { $0.morningReminderEnabled = value } }
        )
    }

    private var billBinding: Binding<Bool> {
        Binding(
            get: { budget.settings.billRemindersEnabled },
            set: { value in budget.updateSettings { $0.billRemindersEnabled = value } }
        )
    }

    private var paceBinding: Binding<Bool> {
        Binding(
            get: { budget.settings.paceWarningsEnabled },
            set: { value in budget.updateSettings { $0.paceWarningsEnabled = value } }
        )
    }

    private var currencyBinding: Binding<String> {
        Binding(
            get: { budget.settings.currencyCode },
            set: { value in budget.updateSettings { $0.currencyCode = value } }
        )
    }
}
