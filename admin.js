const ordersTableBody = document.getElementById('ordersTableBody');
const stats = document.getElementById('stats');
const refreshBtn = document.getElementById('refreshBtn');

const money = (value) => `£${Number(value || 0).toFixed(2)}`;
const fmtDate = (date) => new Date(date).toLocaleString();

function renderStats(orders) {
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
  const paid = orders.filter((order) => order.paymentStatus === 'Paid').length;
  const newOrders = orders.filter((order) => order.status === 'New').length;
  stats.innerHTML = `
    <div class="stat-card"><strong>${orders.length}</strong><span>Total orders</span></div>
    <div class="stat-card"><strong>${money(totalRevenue)}</strong><span>Total pipeline value</span></div>
    <div class="stat-card"><strong>${paid}</strong><span>Paid orders</span></div>
    <div class="stat-card"><strong>${newOrders}</strong><span>New leads</span></div>
  `;
}

async function updateOrder(id, patch) {
  await fetch(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
}

function renderRows(orders) {
  if (!orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="8">No orders yet.</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = orders.map((order) => `
    <tr>
      <td><span class="badge">${order.id}</span></td>
      <td>${fmtDate(order.createdAt)}</td>
      <td>
        <strong>${order.customerName || 'Unknown'}</strong><br>
        <small>${order.email || ''}</small>
      </td>
      <td>${order.postcode || ''}</td>
      <td>${Number(order.quantity || 0).toLocaleString()}</td>
      <td>${money(order.subtotal)}</td>
      <td>
        <select data-id="${order.id}" data-field="status">
          ${['New','Contacted','Scheduled','Completed'].map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </td>
      <td>
        <select data-id="${order.id}" data-field="paymentStatus">
          ${['Pending','Paid','Refunded'].map((status) => `<option value="${status}" ${order.paymentStatus === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('');

  ordersTableBody.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const id = event.target.dataset.id;
      const field = event.target.dataset.field;
      await updateOrder(id, { [field]: event.target.value });
    });
  });
}

async function loadOrders() {
  const response = await fetch('/api/orders');
  const orders = await response.json();
  renderStats(orders);
  renderRows(orders);
}

refreshBtn.addEventListener('click', loadOrders);
loadOrders();
