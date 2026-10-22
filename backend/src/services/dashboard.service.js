import { sampleDashboardData } from "../data/sampleDashboardData.js";

/**
 * Service layer for StudyPilot dashboard operations.
 * Designed to be directly reusable by HTTP routes, MCP tools, and future agent services.
 */
class DashboardService {
  /**
   * Retrieves full dashboard summary.
   */
  async getDashboardOverview() {
    return {
      ...sampleDashboardData,
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves all study tasks.
   */
  async getTasks() {
    return {
      isSampleData: true,
      tasks: sampleDashboardData.tasks,
      total: sampleDashboardData.tasks.length,
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves all upcoming deadlines.
   */
  async getUpcomingDeadlines() {
    return {
      isSampleData: true,
      upcomingDeadlines: sampleDashboardData.upcomingDeadlines,
      total: sampleDashboardData.upcomingDeadlines.length,
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves study progress stats.
   */
  async getStudyProgress() {
    return {
      isSampleData: true,
      studyProgress: sampleDashboardData.studyProgress,
      retrievedAt: new Date().toISOString()
    };
  }
}

export const dashboardService = new DashboardService();
