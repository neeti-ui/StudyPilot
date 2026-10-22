/**
 * Clearly marked sample data for StudyPilot Foundation phase.
 * All records in this file represent mock data used for UI prototyping and API validation.
 */
export const sampleDashboardData = {
  isSampleData: true,
  disclaimer: "SAMPLE DATA: This data is mock information for development, UI validation, and endpoint testing.",
  lastUpdated: new Date().toISOString(),
  student: {
    name: "Alex Sharma",
    program: "B.Tech Computer Science & Engineering",
    year: "2nd Year",
    semester: "4th Semester",
    isSampleData: true
  },
  studyProgress: {
    isSampleData: true,
    weeklyGoalHours: 25,
    completedHours: 16.5,
    percentage: 66,
    currentStreakDays: 5,
    dailyBreakdown: [
      { day: "Mon", hours: 3.5 },
      { day: "Tue", hours: 4.0 },
      { day: "Wed", hours: 2.5 },
      { day: "Thu", hours: 3.5 },
      { day: "Fri", hours: 3.0 },
      { day: "Sat", hours: 0.0 },
      { day: "Sun", hours: 0.0 }
    ],
    subjectBreakdown: [
      { subject: "Data Structures & Algorithms", hoursSpent: 6.5, targetHours: 8 },
      { subject: "Operating Systems", hoursSpent: 4.0, targetHours: 6 },
      { subject: "Database Management Systems", hoursSpent: 3.5, targetHours: 5 },
      { subject: "Alexa+ Hackathon Project", hoursSpent: 2.5, targetHours: 6 }
    ]
  },
  tasks: [
    {
      id: "task-1",
      title: "Implement Dijkstra's Algorithm in C++",
      subject: "Data Structures & Algorithms",
      dueDate: "Tomorrow, 11:59 PM",
      priority: "High",
      status: "In Progress",
      estimatedMinutes: 60,
      isSampleData: true
    },
    {
      id: "task-2",
      title: "Review OS Chapter 5: CPU Scheduling & Synchronization",
      subject: "Operating Systems",
      dueDate: "Oct 21, 2026",
      priority: "Medium",
      status: "Todo",
      estimatedMinutes: 90,
      isSampleData: true
    },
    {
      id: "task-3",
      title: "Solve BCNF & 3NF Normalization Practice Problems",
      subject: "Database Management Systems",
      dueDate: "Oct 23, 2026",
      priority: "High",
      status: "Todo",
      estimatedMinutes: 45,
      isSampleData: true
    },
    {
      id: "task-4",
      title: "Draft StudyPilot Voice Interaction Architecture for Alexa+",
      subject: "Hackathon 2026",
      dueDate: "Oct 25, 2026",
      priority: "Medium",
      status: "Todo",
      estimatedMinutes: 120,
      isSampleData: true
    }
  ],
  upcomingDeadlines: [
    {
      id: "dl-1",
      title: "DSA Lab Assignment 4: Graph Traversals",
      course: "CSE201 - Data Structures",
      date: "Oct 19, 2026",
      time: "23:59",
      urgency: "urgent",
      isSampleData: true
    },
    {
      id: "dl-2",
      title: "DBMS Mid-Semester Quiz 2",
      course: "CSE204 - DBMS",
      date: "Oct 22, 2026",
      time: "10:00 AM",
      urgency: "approaching",
      isSampleData: true
    },
    {
      id: "dl-3",
      title: "OS Virtual Memory Mini-Project Submission",
      course: "CSE206 - Operating Systems",
      date: "Oct 27, 2026",
      time: "17:00",
      urgency: "normal",
      isSampleData: true
    },
    {
      id: "dl-4",
      title: "Amazon Developer Hackathon: Round 1 Prototype",
      course: "Alexa+ Hackathon 2026",
      date: "Nov 02, 2026",
      time: "23:59",
      urgency: "normal",
      isSampleData: true
    }
  ]
};
