const STORAGE_KEY = "spendwise-expenses-v1";
const CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Entertainment", "Other"];

const state = {
  expenses: loadExpenses(),
  editingId: null,
  filters: {
    category: "All",
    from: "",
    to: "",
  },
  sort: {
    field: "date",
    direction: "desc",
  },
};

const elements = {
  form: document.querySelector("#expense-form"),
  formTitle: document.querySelector("#form-title"),
  formStatus: document.querySelector("#form-status"),
  formError: document.querySelector("#form-error"),
  submitButton: document.querySelector("#submit-button"),
  cancelButton: document.querySelector("#cancel-button"),
  title: document.querySelector("#title"),
  amount: document.querySelector("#amount"),
  category: document.querySelector("#category"),
  date: document.querySelector("#date"),
  filterCategory: document.querySelector("#filter-category"),
  filterFrom: document.querySelector("#filter-from"),
  filterTo: document.querySelector("#filter-to"),
  sortBy: document.querySelector("#sort-by"),
  sortOrder: document.querySelector("#sort-order"),
  clearFilters: document.querySelector("#clear-filters"),
  focusForm: document.querySelector("#focus-form"),
  expenseList: document.querySelector("#expense-list"),
  emptyState: document.querySelector("#empty-state"),
  itemTemplate: document.querySelector("#expense-item-template"),
  displayedTotal: document.querySelector("#displayed-total"),
  visibleCount: document.querySelector("#visible-count"),
  storedCount: document.querySelector("#stored-count"),
  resultsSummary: document.querySelector("#results-summary"),
};

initialize();

function initialize() {
  elements.date.value = getToday();
  elements.sortBy.value = state.sort.field;
  elements.sortOrder.value = state.sort.direction;

  elements.form.addEventListener("submit", handleFormSubmit);
  elements.cancelButton.addEventListener("click", resetForm);
  elements.clearFilters.addEventListener("click", resetFilters);
  elements.focusForm.addEventListener("click", focusExpenseForm);
  elements.expenseList.addEventListener("click", handleListAction);

  elements.filterCategory.addEventListener("change", handleFilterChange);
  elements.filterFrom.addEventListener("change", handleFilterChange);
  elements.filterTo.addEventListener("change", handleFilterChange);
  elements.sortBy.addEventListener("change", handleSortChange);
  elements.sortOrder.addEventListener("change", handleSortChange);

  render();
}

function handleFormSubmit(event) {
  event.preventDefault();
  const payload = getFormValues();
  const error = validateExpense(payload);

  if (error) {
    elements.formError.textContent = error;
    return;
  }

  elements.formError.textContent = "";

  if (state.editingId) {
    state.expenses = state.expenses.map((expense) =>
      expense.id === state.editingId ? { ...expense, ...payload } : expense
    );
  } else {
    state.expenses.push({
      id: createExpenseId(),
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }

  persistExpenses();
  resetForm();
  render();
}

function handleListAction(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const expenseItem = actionButton.closest("[data-expense-id]");
  if (!expenseItem) {
    return;
  }

  const expenseId = expenseItem.dataset.expenseId;
  const expense = state.expenses.find((item) => item.id === expenseId);

  if (!expense) {
    return;
  }

  if (actionButton.dataset.action === "edit") {
    startEditing(expense);
    return;
  }

  if (actionButton.dataset.action === "delete") {
    state.expenses = state.expenses.filter((item) => item.id !== expenseId);
    if (state.editingId === expenseId) {
      resetForm();
    }
    persistExpenses();
    render();
  }
}

function handleFilterChange() {
  state.filters.category = elements.filterCategory.value;
  state.filters.from = elements.filterFrom.value;
  state.filters.to = elements.filterTo.value;
  render();
}

function handleSortChange() {
  state.sort.field = elements.sortBy.value;
  state.sort.direction = elements.sortOrder.value;
  render();
}

function startEditing(expense) {
  state.editingId = expense.id;
  elements.formTitle.textContent = "Edit Expense";
  elements.formStatus.textContent = "Edit mode";
  elements.submitButton.textContent = "Update Expense";
  elements.cancelButton.hidden = false;
  elements.formError.textContent = "";

  elements.title.value = expense.title;
  elements.amount.value = expense.amount;
  elements.category.value = expense.category;
  elements.date.value = expense.date;
  elements.title.focus();
}

function resetForm() {
  state.editingId = null;
  elements.form.reset();
  elements.date.value = getToday();
  elements.formTitle.textContent = "Add Expense";
  elements.formStatus.textContent = "Create mode";
  elements.submitButton.textContent = "Add Expense";
  elements.cancelButton.hidden = true;
  elements.formError.textContent = "";
}

function focusExpenseForm() {
  resetForm();
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
  elements.title.focus();
}

function resetFilters() {
  state.filters = {
    category: "All",
    from: "",
    to: "",
  };
  state.sort = {
    field: "date",
    direction: "desc",
  };

  elements.filterCategory.value = state.filters.category;
  elements.filterFrom.value = state.filters.from;
  elements.filterTo.value = state.filters.to;
  elements.sortBy.value = state.sort.field;
  elements.sortOrder.value = state.sort.direction;
  render();
}

function getFormValues() {
  return {
    title: elements.title.value.trim(),
    amount: Number.parseFloat(elements.amount.value),
    category: elements.category.value,
    date: elements.date.value,
  };
}

function validateExpense(expense) {
  if (!expense.title) {
    return "Title is required.";
  }

  if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
    return "Amount must be a positive number.";
  }

  if (!CATEGORIES.includes(expense.category)) {
    return "Please choose a valid category.";
  }

  if (!expense.date) {
    return "Date is required.";
  }

  return "";
}

function hasInvalidDateRange() {
  return Boolean(state.filters.from && state.filters.to && state.filters.from > state.filters.to);
}

function getVisibleExpenses() {
  if (hasInvalidDateRange()) {
    return [];
  }

  const filtered = state.expenses.filter((expense) => {
    const matchesCategory =
      state.filters.category === "All" || expense.category === state.filters.category;
    const matchesFrom = !state.filters.from || expense.date >= state.filters.from;
    const matchesTo = !state.filters.to || expense.date <= state.filters.to;
    return matchesCategory && matchesFrom && matchesTo;
  });

  return filtered.sort((left, right) => {
    const direction = state.sort.direction === "asc" ? 1 : -1;

    if (state.sort.field === "amount") {
      return (left.amount - right.amount) * direction;
    }

    if (state.sort.field === "category") {
      return left.category.localeCompare(right.category) * direction;
    }

    return left.date.localeCompare(right.date) * direction;
  });
}

function render() {
  const visibleExpenses = getVisibleExpenses();
  renderSummary(visibleExpenses);
  renderList(visibleExpenses);
}

function renderSummary(visibleExpenses) {
  const displayedTotal = visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const hasFilters =
    state.filters.category !== "All" || state.filters.from !== "" || state.filters.to !== "";

  elements.displayedTotal.textContent = formatAmount(displayedTotal);
  elements.visibleCount.textContent = String(visibleExpenses.length);
  elements.storedCount.textContent = String(state.expenses.length);

  if (hasInvalidDateRange()) {
    elements.resultsSummary.textContent = "Choose a valid date range.";
    return;
  }

  if (visibleExpenses.length === 0 && state.expenses.length === 0) {
    elements.resultsSummary.textContent = "Showing 0 expenses.";
    return;
  }

  if (visibleExpenses.length === 0 && hasFilters) {
    elements.resultsSummary.textContent = "No expenses match the active filters.";
    return;
  }

  elements.resultsSummary.textContent = `Showing ${visibleExpenses.length} expense${
    visibleExpenses.length === 1 ? "" : "s"
  }, sorted by ${state.sort.field} (${state.sort.direction}).`;
}

function renderList(visibleExpenses) {
  elements.expenseList.innerHTML = "";

  if (visibleExpenses.length === 0) {
    elements.emptyState.hidden = false;

    if (hasInvalidDateRange()) {
      elements.emptyState.innerHTML =
        "<div class=\"empty-state__illustration\" aria-hidden=\"true\"><span></span></div><h3>Invalid date range</h3><p>The start date must be on or before the end date.</p>";
    } else if (state.expenses.length === 0) {
      elements.emptyState.innerHTML =
        "<div class=\"empty-state__illustration\" aria-hidden=\"true\"><span></span></div><h3>No expenses found</h3><p>Try adding an expense or adjusting your current filters.</p>";
    } else {
      elements.emptyState.innerHTML =
        "<div class=\"empty-state__illustration\" aria-hidden=\"true\"><span></span></div><h3>No expenses found</h3><p>Try adding an expense or adjusting your current filters.</p>";
    }

    return;
  }

  elements.emptyState.hidden = true;
  const fragment = document.createDocumentFragment();

  visibleExpenses.forEach((expense) => {
    const item = elements.itemTemplate.content.firstElementChild.cloneNode(true);
    item.dataset.expenseId = expense.id;
    item.querySelector(".expense-row__title").textContent = expense.title;
    item.querySelector(".expense-row__amount").textContent = formatAmount(expense.amount);
    item.querySelector(".expense-row__date").textContent = formatDate(expense.date);
    const categoryChip = item.querySelector(".chip--category");
    categoryChip.textContent = expense.category;
    categoryChip.dataset.category = expense.category;
    fragment.append(item);
  });

  elements.expenseList.append(fragment);
}

function loadExpenses() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isValidStoredExpense);
  } catch {
    return [];
  }
}

function persistExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
}

function isValidStoredExpense(expense) {
  return (
    expense &&
    typeof expense.id === "string" &&
    typeof expense.title === "string" &&
    Number.isFinite(expense.amount) &&
    CATEGORIES.includes(expense.category) &&
    typeof expense.date === "string"
  );
}

function createExpenseId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
