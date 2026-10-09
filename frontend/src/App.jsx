
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const API = "http://localhost:5000/api";

const customerDefaults = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "Lead",
};

const leadDefaults = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "Website",
  status: "New",
};

const leadStatuses = ["New", "Contacted", "Qualified", "Converted", "Lost"];
const customerStatuses = ["Lead", "Active", "Inactive"];

function App() {
  const [page, setPage] = useState("Overview");
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(customerDefaults);
  const [saving, setSaving] = useState(false);

  const isLeadPage = page === "Leads";
  const isCustomerPage = page === "Customers";
  const isRecordPage = isCustomerPage || isLeadPage;

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customerResponse, leadResponse] = await Promise.all([
        axios.get(`${API}/customers`),
        axios.get(`${API}/leads`),
      ]);

      setCustomers(
        Array.isArray(customerResponse.data) ? customerResponse.data : []
      );
      setLeads(
        Array.isArray(leadResponse.data) ? leadResponse.data : []
      );
    } catch (err) {
      console.error("Failed to load CRM data:", err);
      setError(
        "Could not load data. Check that the backend and MongoDB are running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const records = isLeadPage ? leads : customers;

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const searchableValues = [
        record.name,
        record.email,
        record.company,
        record.phone,
        ...(isLeadPage ? [record.source] : []),
      ];

      const matchesSearch = searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "All" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter, isLeadPage]);

  const activeCount = customers.filter(
    (customer) => customer.status === "Active"
  ).length;

  const inactiveCount = customers.filter(
    (customer) => customer.status === "Inactive"
  ).length;

  const openLeadCount = leads.filter(
    (lead) => !["Converted", "Lost"].includes(lead.status)
  ).length;

  const convertedLeadCount = leads.filter(
    (lead) => lead.status === "Converted"
  ).length;

  const conversionRate =
    leads.length === 0
      ? 0
      : Math.round((convertedLeadCount / leads.length) * 100);

  const customerStatusData = {
    labels: customerStatuses,
    datasets: [
      {
        label: "Customers",
        data: customerStatuses.map(
          (status) =>
            customers.filter((customer) => customer.status === status).length
        ),
        backgroundColor: ["#f0a43c", "#35b987", "#9ca3af"],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const leadStatusData = {
    labels: leadStatuses,
    datasets: [
      {
        label: "Number of leads",
        data: leadStatuses.map(
          (status) => leads.filter((lead) => lead.status === status).length
        ),
        backgroundColor: [
          "#4096df",
          "#f0a43c",
          "#6254de",
          "#35b987",
          "#d94d61",
        ],
        borderRadius: 6,
        maxBarThickness: 48,
      },
    ],
  };

  const pageDescription = {
    Overview: "Here's what's happening with your customers today.",
    Customers: "Manage your customer relationships.",
    Leads: "Track potential customers from discovery to conversion.",
    Reports: "Review and analyse your CRM performance.",
  };

  function navigateTo(nextPage) {
    setPage(nextPage);
    setSearch("");
    setStatusFilter("All");
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function openAddForm() {
    setEditingId(null);
    setForm(isLeadPage ? { ...leadDefaults } : { ...customerDefaults });
    setShowForm(true);
  }

  function openEditForm(record) {
    setEditingId(record._id);

    if (isLeadPage) {
      setForm({
        name: record.name || "",
        email: record.email || "",
        phone: record.phone || "",
        company: record.company || "",
        source: record.source || "Website",
        status: record.status || "New",
      });
    } else {
      setForm({
        name: record.name || "",
        email: record.email || "",
        phone: record.phone || "",
        company: record.company || "",
        status: record.status || "Lead",
      });
    }

    setShowForm(true);
  }

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const endpoint = isLeadPage ? "leads" : "customers";
    const setRecords = isLeadPage ? setLeads : setCustomers;
    const recordType = isLeadPage ? "lead" : "customer";

    try {
      if (editingId) {
        const response = await axios.put(
          `${API}/${endpoint}/${editingId}`,
          form
        );

        setRecords((previous) =>
          previous.map((record) =>
            record._id === editingId ? response.data : record
          )
        );
      } else {
        const response = await axios.post(`${API}/${endpoint}`, form);
        setRecords((previous) => [...previous, response.data]);
      }

      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error(`Could not save ${recordType}:`, err);
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Check the backend API and try again.";

      alert(`Could not save ${recordType}. ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id) {
    const recordType = isLeadPage ? "lead" : "customer";

    if (!window.confirm(`Are you sure you want to delete this ${recordType}?`)) {
      return;
    }

    const endpoint = isLeadPage ? "leads" : "customers";
    const setRecords = isLeadPage ? setLeads : setCustomers;

    try {
      await axios.delete(`${API}/${endpoint}/${id}`);
      setRecords((previous) =>
        previous.filter((record) => record._id !== id)
      );
    } catch (err) {
      console.error(`Could not delete ${recordType}:`, err);
      alert(`Could not delete ${recordType}. Check the backend API.`);
    }
  }

  
  async function convertLead(lead) {
    if (lead.status !== "Qualified") {
      alert("Only qualified leads can be converted.");
      return;
    }

    const confirmed = window.confirm(
      `Convert ${lead.name} into an active customer?`
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await axios.post(
        `${API}/leads/${lead._id}/convert`
      );

      const { customer, lead: updatedLead } = response.data;

      // Update the lead status in the Leads page.
      setLeads((previous) =>
        previous.map((item) =>
          item._id === updatedLead._id ? updatedLead : item
        )
      );

      // Add the new customer to the Customers page.
      setCustomers((previous) => [
        customer,
        ...previous.filter((item) => item._id !== customer._id),
      ]);

      alert(`${customer.name} was successfully added as a customer!`);
    } catch (err) {
      console.error("Lead conversion failed:", err);

      alert(
        err.response?.data?.message ||
          "Could not convert this lead. Please try again."
      );
    }
  }


  function getInitials(name = "") {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function statusClass(status = "") {
    return status.toLowerCase().replace(/\s+/g, "-");
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  const leadChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0, stepSize: 1 },
      },
    },
  };

  return (
    <div className="crm-app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">N</span>
          Nexus CRM
        </div>

        <p className="nav-label">WORKSPACE</p>

        {[
          { name: "Overview", icon: "▦" },
          { name: "Customers", icon: "♙" },
          { name: "Leads", icon: "◎" },
          { name: "Reports", icon: "▤" },
        ].map((item) => (
          <button
            key={item.name}
            className={`nav-item ${page === item.name ? "active" : ""}`}
            onClick={() => navigateTo(item.name)}
          >
            {item.icon} &nbsp; {item.name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="profile-avatar">NJ</div>
          <div>
            <strong>Administrator</strong>
            <small>CRM Workspace</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>
            Workspace / <strong>{page}</strong>
          </span>
          <div className="top-user">
            <span>●</span> Admin
          </div>
        </header>

        <section className="dashboard">
          <div className="page-heading">
            <div>
              <p className="eyebrow">CUSTOMER RELATIONSHIP MANAGEMENT</p>
              <h1>{page === "Overview" ? "Good morning, Admin 👋" : page}</h1>
              <p className="muted">{pageDescription[page]}</p>
            </div>

            {isRecordPage && (
              <button className="primary-button" onClick={openAddForm}>
                + Add {isLeadPage ? "Lead" : "Customer"}
              </button>
            )}
          </div>

          {error && (
            <div className="crm-error">
              {error}
              <button onClick={loadData}>Retry</button>
            </div>
          )}

          {(page === "Overview" || page === "Reports") && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span>Total Customers</span>
                  <span className="stat-icon purple">♙</span>
                </div>
                <h2>{customers.length}</h2>
                <p className="stat-note">All customer records</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Active Clients</span>
                  <span className="stat-icon green">✓</span>
                </div>
                <h2>{activeCount}</h2>
                <p className="stat-note">Currently active</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Open Leads</span>
                  <span className="stat-icon orange">◎</span>
                </div>
                <h2>{openLeadCount}</h2>
                <p className="stat-note">Potential customers</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Inactive Customers</span>
                  <span className="stat-icon blue">◷</span>
                </div>
                <h2>{inactiveCount}</h2>
                <p className="stat-note">Currently inactive</p>
              </div>
            </div>
          )}

          {page === "Reports" && (
            <>
              <div className="reports-grid">
                <section className="customer-panel report-card">
                  <div className="panel-heading">
                    <div>
                      <h2>Customer Distribution</h2>
                      <p className="muted">Customers by current status</p>
                    </div>
                  </div>
                  <div className="chart-container doughnut-chart">
                    {customers.length === 0 ? (
                      <p className="empty-chart">No customer data to display yet.</p>
                    ) : (
                      <Doughnut data={customerStatusData} options={chartOptions} />
                    )}
                  </div>
                </section>

                <section className="customer-panel report-card">
                  <div className="panel-heading">
                    <div>
                      <h2>Lead Pipeline</h2>
                      <p className="muted">Leads by current status</p>
                    </div>
                  </div>
                  <div className="chart-container">
                    {leads.length === 0 ? (
                      <p className="empty-chart">No lead data to display yet.</p>
                    ) : (
                      <Bar data={leadStatusData} options={leadChartOptions} />
                    )}
                  </div>
                </section>

                <section className="customer-panel conversion-card">
                  <div className="conversion-icon">↗</div>
                  <p className="muted">Lead Conversion Rate</p>
                  <h2>{conversionRate}%</h2>
                  <p className="stat-note">
                    {convertedLeadCount} converted out of {leads.length} total
                    leads
                  </p>
                </section>
              </div>

              <section className="customer-panel report-summary">
                <div className="panel-heading">
                  <div>
                    <h2>Pipeline Summary</h2>
                    <p className="muted">Detailed lead status counts</p>
                  </div>
                </div>
                <div className="pipeline-list">
                  {leadStatuses.map((status) => {
                    const count = leads.filter(
                      (lead) => lead.status === status
                    ).length;

                    return (
                      <div className="pipeline-row" key={status}>
                        <span
                          className={`status-badge ${statusClass(status)}`}
                        >
                          {status}
                        </span>
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {page === "Overview" && (
            <>
              <section className="customer-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent Customers</h2>
                    <p className="muted">Your latest customer records</p>
                  </div>
                  <button
                    className="cancel-button"
                    onClick={() => navigateTo("Customers")}
                  >
                    View All
                  </button>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>COMPANY</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="3" className="empty-state">
                            Loading customers...
                          </td>
                        </tr>
                      ) : customers.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="empty-state">
                            No customers yet. Add your first customer from the
                            Customers page.
                          </td>
                        </tr>
                      ) : (
                        [...customers].slice(-5).reverse().map((customer, index) => (
                          <tr key={customer._id}>
                            <td>
                              <div className="customer-cell">
                                <span className={`customer-avatar avatar-${index % 4}`}>
                                  {getInitials(customer.name)}
                                </span>
                                <div>
                                  <strong>{customer.name}</strong>
                                  <small>{customer.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>{customer.company}</td>
                            <td>
                              <span className={`status-badge ${statusClass(customer.status)}`}>
                                {customer.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="customer-panel overview-leads">
                <div className="panel-heading">
                  <div>
                    <h2>Recent Leads</h2>
                    <p className="muted">Potential customers in your pipeline</p>
                  </div>
                  <button
                    className="cancel-button"
                    onClick={() => navigateTo("Leads")}
                  >
                    View All
                  </button>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>LEAD</th>
                        <th>COMPANY</th>
                        <th>SOURCE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="empty-state">
                            Loading leads...
                          </td>
                        </tr>
                      ) : leads.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="empty-state">
                            No leads yet. Add your first lead from the Leads
                            page.
                          </td>
                        </tr>
                      ) : (
                        [...leads].slice(-5).reverse().map((lead, index) => (
                          <tr key={lead._id}>
                            <td>
                              <div className="customer-cell">
                                <span className={`customer-avatar avatar-${index % 4}`}>
                                  {getInitials(lead.name)}
                                </span>
                                <div>
                                  <strong>{lead.name}</strong>
                                  <small>{lead.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>{lead.company}</td>
                            <td>{lead.source || "Website"}</td>
                            <td>
                              <span className={`status-badge ${statusClass(lead.status)}`}>
                                {lead.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {isRecordPage && (
            <section className="customer-panel">
              <div className="panel-heading">
                <div>
                  <h2>{isLeadPage ? "Lead Management" : "Customers"}</h2>
                  <p className="muted">
                    {isLeadPage
                      ? "Manage and track your sales opportunities"
                      : "View and manage your customer records"}
                  </p>
                </div>
                <span className="record-count">
                  {filteredRecords.length} records
                </span>
              </div>

              <div className="table-tools">
                <input
                  className="search-input"
                  placeholder="⌕  Search name, email or company..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All statuses</option>
                  {(isLeadPage ? leadStatuses : customerStatuses).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>{isLeadPage ? "LEAD" : "CUSTOMER"}</th>
                      <th>COMPANY</th>
                      {isLeadPage && <th>SOURCE</th>}
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={isLeadPage ? 5 : 4} className="empty-state">
                          Loading records...
                        </td>
                      </tr>
                    ) : filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={isLeadPage ? 5 : 4} className="empty-state">
                          No {isLeadPage ? "leads" : "customers"} found. Click
                          "+ Add {isLeadPage ? "Lead" : "Customer"}" to create
                          one.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record, index) => (
                        <tr key={record._id}>
                          <td>
                            <div className="customer-cell">
                              <span className={`customer-avatar avatar-${index % 4}`}>
                                {getInitials(record.name)}
                              </span>
                              <div>
                                <strong>{record.name}</strong>
                                <small>{record.email}</small>
                                {record.phone && <small>{record.phone}</small>}
                              </div>
                            </div>
                          </td>
                          <td>{record.company}</td>
                          {isLeadPage && <td>{record.source || "Website"}</td>}
                          <td>
                            <span className={`status-badge ${statusClass(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                         
<td className="actions">
  <button onClick={() => openEditForm(record)}>
    Edit
  </button>

  {isLeadPage && record.status === "Qualified" && (
    <button
      className="convert-button"
      onClick={() => convertLead(record)}
    >
      Convert
    </button>
  )}

  <button
    className="delete-button"
    onClick={() => deleteRecord(record._id)}
  >
    Delete
  </button>
</td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer>© 2026 Nexus CRM · Enterprise Customer Management</footer>
        </section>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <form className="customer-form" onSubmit={saveRecord}>
            <div className="modal-heading">
              <h2>
                {editingId ? "Edit" : "Add"} {isLeadPage ? "Lead" : "Customer"}
              </h2>
              <button
                type="button"
                className="close-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <label>
              Full name
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Enter full name"
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="name@example.com"
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="Enter phone number"
              />
            </label>

            <label>
              Company
              <input
                required
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
                placeholder="Enter company name"
              />
            </label>

            {isLeadPage && (
              <label>
                Lead source
                <select
                  value={form.source}
                  onChange={(event) => setForm({ ...form, source: event.target.value })}
                >
                  {["Website", "Referral", "Social Media", "Advertisement", "Cold Call", "Other"].map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {(isLeadPage ? leadStatuses : customerStatuses).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? "Saving..." : `Save ${isLeadPage ? "Lead" : "Customer"}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
