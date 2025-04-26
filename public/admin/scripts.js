/**
 * Admin Panel JavaScript
 * This file manages authentication, data fetching and UI interactions for the admin panel
 */

// API Base URL
const API_BASE = '';

// Store auth token
let authToken = localStorage.getItem('adminToken');

// Current user info
let currentUser = null;

// Page references
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Dashboard elements
const userInitials = document.getElementById('userInitials');
const adminUsername = document.getElementById('adminUsername');
const refreshStats = document.getElementById('refreshStats');
const refreshUsers = document.getElementById('refreshUsers');
const refreshCalls = document.getElementById('refreshCalls');
const refreshLogs = document.getElementById('refreshLogs');
const logLevelFilter = document.getElementById('logLevelFilter');
const logSourceFilter = document.getElementById('logSourceFilter');

// Tables
const siteStatsTable = document.getElementById('siteStatsTable');
const recentLogsTable = document.getElementById('recentLogsTable');
const usersTable = document.getElementById('usersTable');
const callsTable = document.getElementById('callsTable');
const systemLogsTable = document.getElementById('systemLogsTable');

// Stats counters
const totalUsersCount = document.getElementById('totalUsersCount');
const totalAgentsCount = document.getElementById('totalAgentsCount');
const totalCallsCount = document.getElementById('totalCallsCount');
const activeCallsCount = document.getElementById('activeCallsCount');
const activeBadge = document.getElementById('activeBadge');

// Pagination containers
const callsPagination = document.getElementById('callsPagination');
const logsPagination = document.getElementById('logsPagination');

// Loading spinner
const spinnerOverlay = document.getElementById('spinnerOverlay');

// Current state
const state = {
  callsPage: 1,
  callsLimit: 20,
  logsPage: 1,
  logsLimit: 50,
  activeTab: 'dashboard'
};

/**
 * Initialize the admin panel
 */
function init() {
  // Attach event listeners
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  refreshStats.addEventListener('click', loadDashboardData);
  refreshUsers.addEventListener('click', loadUsers);
  refreshCalls.addEventListener('click', () => loadCallHistory(1));
  refreshLogs.addEventListener('click', () => loadSystemLogs(1));
  
  // Add navigation event listeners
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const page = e.currentTarget.getAttribute('data-page');
      showPage(page);
    });
  });
  
  // Add filter event listeners
  logLevelFilter.addEventListener('change', () => loadSystemLogs(1));
  logSourceFilter.addEventListener('change', () => loadSystemLogs(1));
  
  // Check authentication
  checkAuth();
  
  // Handle hash-based navigation
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

/**
 * Handle hash-based navigation
 */
function handleHashChange() {
  const hash = window.location.hash.substring(1) || 'dashboard';
  showPage(hash);
}

/**
 * Show a specific page and hide others
 */
function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page-content').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Remove active class from all sidebar links
  document.querySelectorAll('.sidebar-link').forEach(el => {
    el.classList.remove('active');
  });
  
  // Show the selected page
  const pageEl = document.getElementById(`${page}Page`);
  if (pageEl) {
    pageEl.classList.remove('hidden');
    // Add active class to the sidebar link
    const linkEl = document.querySelector(`.sidebar-link[data-page="${page}"]`);
    if (linkEl) {
      linkEl.classList.add('active');
    }
    
    // Set the hash
    window.location.hash = page;
    
    // Update state
    state.activeTab = page;
    
    // Load data for the page if needed
    if (page === 'dashboard' && authToken) {
      loadDashboardData();
    } else if (page === 'users' && authToken) {
      loadUsers();
    } else if (page === 'calls' && authToken) {
      loadCallHistory(state.callsPage);
    } else if (page === 'logs' && authToken) {
      loadSystemLogs(state.logsPage);
    }
  }
}

/**
 * Show the loading spinner
 */
function showSpinner() {
  spinnerOverlay.classList.remove('hidden');
}

/**
 * Hide the loading spinner
 */
function hideSpinner() {
  spinnerOverlay.classList.add('hidden');
}

/**
 * Display an error message
 */
function showError(message, element = loginError) {
  element.textContent = message;
  element.classList.remove('hidden');
}

/**
 * Hide an error message
 */
function hideError(element = loginError) {
  element.classList.add('hidden');
}

/**
 * Check if the user is authenticated
 */
async function checkAuth() {
  if (!authToken) {
    showLogin();
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const user = await response.json();
    currentUser = user;
    
    // Update user info
    userInitials.textContent = getInitials(user.username);
    adminUsername.textContent = user.username;
    
    // Show dashboard
    showDashboard();
    
  } catch (error) {
    console.error('Auth check failed:', error);
    // Clear token and show login
    localStorage.removeItem('adminToken');
    authToken = null;
    showLogin();
  }
}

/**
 * Get initials from a name
 */
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();
  hideError();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    showError('Please enter both username and password');
    return;
  }
  
  showSpinner();
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Save token and user info
    authToken = data.token;
    localStorage.setItem('adminToken', authToken);
    currentUser = data.user;
    
    // Update user info
    userInitials.textContent = getInitials(data.user.username);
    adminUsername.textContent = data.user.username;
    
    // Show dashboard
    showDashboard();
    
  } catch (error) {
    console.error('Login failed:', error);
    showError(error.message || 'Login failed. Please try again.');
  } finally {
    hideSpinner();
  }
}

/**
 * Handle user logout
 */
function handleLogout() {
  // Clear auth token
  localStorage.removeItem('adminToken');
  authToken = null;
  currentUser = null;
  
  // Show login screen
  showLogin();
}

/**
 * Show the login screen
 */
function showLogin() {
  loginContainer.classList.remove('hidden');
  dashboardContainer.classList.add('hidden');
  // Clear any previously entered credentials
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

/**
 * Show the dashboard
 */
function showDashboard() {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');
  
  // Load dashboard data
  loadDashboardData();
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
  if (!authToken) return;
  
  showSpinner();
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/data/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load dashboard data');
    }
    
    const data = await response.json();
    
    // Update stat counters
    totalUsersCount.textContent = data.userCount;
    totalAgentsCount.textContent = data.agentCount;
    totalCallsCount.textContent = data.callCount;
    activeCallsCount.textContent = data.activeCallCount;
    
    // Show active calls badge if there are any
    if (data.activeCallCount > 0) {
      activeBadge.textContent = data.activeCallCount;
      activeBadge.classList.remove('hidden');
    } else {
      activeBadge.classList.add('hidden');
    }
    
    // Render site stats
    renderSiteStats(data.siteStats);
    
    // Render recent logs
    renderRecentLogs(data.recentLogs);
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  } finally {
    hideSpinner();
  }
}

/**
 * Render site statistics
 */
function renderSiteStats(stats) {
  siteStatsTable.innerHTML = '';
  
  if (stats.length === 0) {
    siteStatsTable.innerHTML = '<tr><td colspan="3" class="text-center">No statistics available</td></tr>';
    return;
  }
  
  stats.forEach(stat => {
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = formatStatName(stat.name);
    
    const valueCell = document.createElement('td');
    valueCell.textContent = stat.value;
    
    const updatedCell = document.createElement('td');
    updatedCell.textContent = formatDate(stat.lastUpdated);
    
    row.appendChild(nameCell);
    row.appendChild(valueCell);
    row.appendChild(updatedCell);
    
    siteStatsTable.appendChild(row);
  });
}

/**
 * Format a statistic name for display
 */
function formatStatName(name) {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Render recent logs
 */
function renderRecentLogs(logs) {
  recentLogsTable.innerHTML = '';
  
  if (logs.length === 0) {
    recentLogsTable.innerHTML = '<tr><td colspan="4" class="text-center">No logs available</td></tr>';
    return;
  }
  
  // Show only the 10 most recent logs
  logs.slice(0, 10).forEach(log => {
    const row = document.createElement('tr');
    
    const levelCell = document.createElement('td');
    levelCell.textContent = log.level;
    levelCell.className = `log-level-${log.level.toLowerCase()}`;
    
    const sourceCell = document.createElement('td');
    sourceCell.textContent = log.source;
    
    const messageCell = document.createElement('td');
    messageCell.textContent = log.message;
    
    const timeCell = document.createElement('td');
    timeCell.textContent = formatDate(log.createdAt);
    
    row.appendChild(levelCell);
    row.appendChild(sourceCell);
    row.appendChild(messageCell);
    row.appendChild(timeCell);
    
    recentLogsTable.appendChild(row);
  });
}

/**
 * Load users data
 */
async function loadUsers() {
  if (!authToken) return;
  
  showSpinner();
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/data/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load users data');
    }
    
    const users = await response.json();
    renderUsers(users);
    
  } catch (error) {
    console.error('Error loading users data:', error);
  } finally {
    hideSpinner();
  }
}

/**
 * Render users table
 */
function renderUsers(users) {
  usersTable.innerHTML = '';
  
  if (users.length === 0) {
    usersTable.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
    return;
  }
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    const idCell = document.createElement('td');
    idCell.textContent = user.id;
    
    const usernameCell = document.createElement('td');
    usernameCell.textContent = user.username;
    
    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;
    
    const displayNameCell = document.createElement('td');
    displayNameCell.textContent = user.displayName || '-';
    
    const adminCell = document.createElement('td');
    adminCell.innerHTML = user.isAdmin ? 
      '<span class="badge bg-success">Yes</span>' : 
      '<span class="badge bg-secondary">No</span>';
    
    const createdAtCell = document.createElement('td');
    createdAtCell.textContent = formatDate(user.createdAt);
    
    row.appendChild(idCell);
    row.appendChild(usernameCell);
    row.appendChild(emailCell);
    row.appendChild(displayNameCell);
    row.appendChild(adminCell);
    row.appendChild(createdAtCell);
    
    usersTable.appendChild(row);
  });
}

/**
 * Load call history
 */
async function loadCallHistory(page = 1) {
  if (!authToken) return;
  
  showSpinner();
  state.callsPage = page;
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/data/calls?page=${page}&limit=${state.callsLimit}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load call history');
    }
    
    const data = await response.json();
    renderCallHistory(data.calls);
    renderPagination(data.pagination, callsPagination, loadCallHistory);
    
  } catch (error) {
    console.error('Error loading call history:', error);
  } finally {
    hideSpinner();
  }
}

/**
 * Render call history table
 */
function renderCallHistory(calls) {
  callsTable.innerHTML = '';
  
  if (calls.length === 0) {
    callsTable.innerHTML = '<tr><td colspan="8" class="text-center">No calls found</td></tr>';
    return;
  }
  
  calls.forEach(call => {
    const row = document.createElement('tr');
    
    const idCell = document.createElement('td');
    idCell.textContent = call.id;
    
    const fromCell = document.createElement('td');
    fromCell.textContent = call.phoneFrom;
    
    const toCell = document.createElement('td');
    toCell.textContent = call.phoneTo;
    
    const agentCell = document.createElement('td');
    agentCell.textContent = call.agentName || '-';
    
    const statusCell = document.createElement('td');
    let statusBadge = 'bg-secondary';
    if (call.status === 'active') statusBadge = 'bg-success';
    if (call.status === 'completed') statusBadge = 'bg-primary';
    if (call.status === 'failed') statusBadge = 'bg-danger';
    statusCell.innerHTML = `<span class="badge ${statusBadge}">${call.status}</span>`;
    
    const durationCell = document.createElement('td');
    durationCell.textContent = call.duration ? `${call.duration}s` : '-';
    
    const startedCell = document.createElement('td');
    startedCell.textContent = formatDate(call.createdAt);
    
    const endedCell = document.createElement('td');
    endedCell.textContent = call.endedAt ? formatDate(call.endedAt) : '-';
    
    row.appendChild(idCell);
    row.appendChild(fromCell);
    row.appendChild(toCell);
    row.appendChild(agentCell);
    row.appendChild(statusCell);
    row.appendChild(durationCell);
    row.appendChild(startedCell);
    row.appendChild(endedCell);
    
    callsTable.appendChild(row);
  });
}

/**
 * Load system logs
 */
async function loadSystemLogs(page = 1) {
  if (!authToken) return;
  
  showSpinner();
  state.logsPage = page;
  
  // Get filter values
  const level = logLevelFilter.value;
  const source = logSourceFilter.value;
  
  try {
    let url = `${API_BASE}/api/admin/data/logs?page=${page}&limit=${state.logsLimit}`;
    if (level) url += `&level=${level}`;
    if (source) url += `&source=${source}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load system logs');
    }
    
    const data = await response.json();
    renderSystemLogs(data.logs);
    renderPagination(data.pagination, logsPagination, loadSystemLogs);
    
  } catch (error) {
    console.error('Error loading system logs:', error);
  } finally {
    hideSpinner();
  }
}

/**
 * Render system logs table
 */
function renderSystemLogs(logs) {
  systemLogsTable.innerHTML = '';
  
  if (logs.length === 0) {
    systemLogsTable.innerHTML = '<tr><td colspan="5" class="text-center">No logs found</td></tr>';
    return;
  }
  
  logs.forEach(log => {
    const row = document.createElement('tr');
    
    const idCell = document.createElement('td');
    idCell.textContent = log.id;
    
    const levelCell = document.createElement('td');
    levelCell.textContent = log.level;
    levelCell.className = `log-level-${log.level.toLowerCase()}`;
    
    const sourceCell = document.createElement('td');
    sourceCell.textContent = log.source;
    
    const messageCell = document.createElement('td');
    messageCell.textContent = log.message;
    
    const timeCell = document.createElement('td');
    timeCell.textContent = formatDate(log.createdAt);
    
    row.appendChild(idCell);
    row.appendChild(levelCell);
    row.appendChild(sourceCell);
    row.appendChild(messageCell);
    row.appendChild(timeCell);
    
    systemLogsTable.appendChild(row);
  });
}

/**
 * Render pagination controls
 */
function renderPagination(pagination, container, loadFunction) {
  container.innerHTML = '';
  
  if (pagination.pages <= 1) {
    return;
  }
  
  const ul = document.createElement('ul');
  ul.className = 'pagination';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${pagination.page === 1 ? 'disabled' : ''}`;
  const prevLink = document.createElement('a');
  prevLink.className = 'page-link';
  prevLink.href = '#';
  prevLink.innerHTML = '&laquo;';
  if (pagination.page > 1) {
    prevLink.addEventListener('click', (e) => {
      e.preventDefault();
      loadFunction(pagination.page - 1);
    });
  }
  prevLi.appendChild(prevLink);
  ul.appendChild(prevLi);
  
  // Page numbers
  let startPage = Math.max(1, pagination.page - 2);
  let endPage = Math.min(pagination.pages, pagination.page + 2);
  
  // Ensure we always show 5 pages if possible
  if (endPage - startPage < 4) {
    if (startPage === 1) {
      endPage = Math.min(pagination.pages, startPage + 4);
    } else if (endPage === pagination.pages) {
      startPage = Math.max(1, endPage - 4);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item ${i === pagination.page ? 'active' : ''}`;
    
    const pageLink = document.createElement('a');
    pageLink.className = 'page-link';
    pageLink.href = '#';
    pageLink.textContent = i;
    pageLink.addEventListener('click', (e) => {
      e.preventDefault();
      loadFunction(i);
    });
    
    pageLi.appendChild(pageLink);
    ul.appendChild(pageLi);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`;
  const nextLink = document.createElement('a');
  nextLink.className = 'page-link';
  nextLink.href = '#';
  nextLink.innerHTML = '&raquo;';
  if (pagination.page < pagination.pages) {
    nextLink.addEventListener('click', (e) => {
      e.preventDefault();
      loadFunction(pagination.page + 1);
    });
  }
  nextLi.appendChild(nextLink);
  ul.appendChild(nextLi);
  
  container.appendChild(ul);
}

/**
 * Format a date for display
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);