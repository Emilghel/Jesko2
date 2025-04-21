/**
 * Deleted Agents Store
 * 
 * This module manages a persistent list of deleted agent IDs in localStorage
 * to ensure agents remain visually deleted even if server deletion fails.
 */

// LocalStorage key for deleted agent IDs
const DELETED_AGENTS_KEY = 'wln_deleted_agent_ids';

/**
 * Get the list of deleted agent IDs from localStorage
 */
export function getDeletedAgentIds(): number[] {
  try {
    const storedIds = localStorage.getItem(DELETED_AGENTS_KEY);
    if (!storedIds) return [];
    
    const parsedIds = JSON.parse(storedIds);
    if (Array.isArray(parsedIds)) {
      return parsedIds.map(id => Number(id)).filter(id => !isNaN(id));
    }
    return [];
  } catch (error) {
    console.error('Error getting deleted agent IDs from localStorage:', error);
    return [];
  }
}

/**
 * Add an agent ID to the deleted list
 */
export function markAgentAsDeleted(agentId: number): void {
  try {
    const currentIds = getDeletedAgentIds();
    if (!currentIds.includes(agentId)) {
      const updatedIds = [...currentIds, agentId];
      localStorage.setItem(DELETED_AGENTS_KEY, JSON.stringify(updatedIds));
      console.log(`Marked agent ${agentId} as deleted in localStorage`);
    }
  } catch (error) {
    console.error(`Error marking agent ${agentId} as deleted:`, error);
  }
}

/**
 * Check if an agent is marked as deleted
 */
export function isAgentDeleted(agentId: number): boolean {
  return getDeletedAgentIds().includes(agentId);
}

/**
 * Filter a list of agents to remove deleted ones
 */
export function filterDeletedAgents<T extends { id: number }>(agents: T[]): T[] {
  const deletedIds = getDeletedAgentIds();
  return agents.filter(agent => !deletedIds.includes(agent.id));
}

/**
 * Restore an agent (remove from deleted list)
 */
export function unmarkAgentAsDeleted(agentId: number): void {
  try {
    const currentIds = getDeletedAgentIds();
    const updatedIds = currentIds.filter(id => id !== agentId);
    localStorage.setItem(DELETED_AGENTS_KEY, JSON.stringify(updatedIds));
  } catch (error) {
    console.error(`Error unmarking agent ${agentId} as deleted:`, error);
  }
}

/**
 * Clear all deleted agent IDs
 */
export function clearDeletedAgents(): void {
  localStorage.removeItem(DELETED_AGENTS_KEY);
}