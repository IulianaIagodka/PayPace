import SwiftUI

struct UpcomingBillsView: View {
    @Bindable var budget: BudgetStore
    @State private var showAdd = false
    @State private var editing: Bill?

    private var currency: CurrencyFormatter {
        CurrencyFormatter(code: budget.settings.currencyCode)
    }

    var body: some View {
        ZStack {
            PayPaceBackground()

            List {
                if let cycle = budget.activeCycle {
                    Section {
                        ForEach(cycle.upcomingBills) { bill in
                            Button {
                                editing = bill
                            } label: {
                                BillRowView(bill: bill, currency: currency)
                            }
                            .buttonStyle(.plain)
                            .listRowBackground(Color.white.opacity(0.55))
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    budget.deleteBill(id: bill.id)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                Button {
                                    var paid = bill
                                    paid.isPaid = true
                                    budget.updateBill(paid)
                                } label: {
                                    Label("Paid", systemImage: "checkmark")
                                }
                                .tint(PayPaceTheme.success)
                            }
                        }
                    } header: {
                        Text("Due before \(DateFormatting.medium(cycle.nextPayday))")
                    } footer: {
                        Text("Total reserved for bills: \(currency.string(from: cycle.unpaidBillsTotal))")
                    }

                    let paid = cycle.bills.filter(\.isPaid)
                    if !paid.isEmpty {
                        Section("Already paid") {
                            ForEach(paid) { bill in
                                BillRowView(bill: bill, currency: currency)
                                    .opacity(0.55)
                                    .listRowBackground(Color.white.opacity(0.4))
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Upcoming bills")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showAdd = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAdd) {
            AddBillSheet(payday: budget.activeCycle?.nextPayday ?? .now, currencyCode: budget.settings.currencyCode) { bill in
                if bill.isRecurring && !budget.settings.isPremium {
                    // Recurring bills are premium; still save as one-time for free users.
                    var oneTime = bill
                    oneTime.isRecurring = false
                    budget.addBill(oneTime)
                } else {
                    budget.addBill(bill)
                }
            }
        }
        .sheet(item: $editing) { bill in
            AddBillSheet(payday: budget.activeCycle?.nextPayday ?? .now, existing: bill, currencyCode: budget.settings.currencyCode) { updated in
                budget.updateBill(updated)
            }
        }
    }
}
