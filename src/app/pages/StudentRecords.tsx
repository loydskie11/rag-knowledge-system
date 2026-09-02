import { useState } from "react";
import { Search, Filter, Download, Eye, ChevronDown, ChevronRight, Users, GraduationCap } from "lucide-react";

interface Student {
  id: string;
  name: string;
  studentId: string;
  strand: string;
  year: number;
  email: string;
  status: "Active" | "Inactive";
}

interface CourseData {
  name: string;
  code: string;
  students: Student[];
}

export function StudentRecords() {
  const [expandedCourse, setExpandedCourse] = useState<string | null>("BSIT");
  const [searchQuery, setSearchQuery] = useState("");

  const courses: CourseData[] = [
    {
      name: "Bachelor of Science in Information Technology",
      code: "BSIT",
      students: [
        {
          id: "1",
          name: "Juan Dela Cruz",
          studentId: "2023-001-BSIT",
          strand: "STEM",
          year: 2,
          email: "juan.delacruz@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "2",
          name: "Maria Santos",
          studentId: "2023-002-BSIT",
          strand: "STEM",
          year: 2,
          email: "maria.santos@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "3",
          name: "Pedro Garcia",
          studentId: "2024-001-BSIT",
          strand: "TVL-ICT",
          year: 1,
          email: "pedro.garcia@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "4",
          name: "Ana Reyes",
          studentId: "2024-002-BSIT",
          strand: "STEM",
          year: 1,
          email: "ana.reyes@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "5",
          name: "Carlos Lopez",
          studentId: "2022-001-BSIT",
          strand: "STEM",
          year: 3,
          email: "carlos.lopez@ctu.edu.ph",
          status: "Active"
        }
      ]
    },
    {
      name: "Bachelor in Industrial Technology",
      code: "BIT",
      students: [
        {
          id: "6",
          name: "Roberto Fernandez",
          studentId: "2023-003-BIT",
          strand: "TVL-IA",
          year: 2,
          email: "roberto.fernandez@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "7",
          name: "Sofia Martinez",
          studentId: "2023-004-BIT",
          strand: "TVL-HE",
          year: 2,
          email: "sofia.martinez@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "8",
          name: "Miguel Torres",
          studentId: "2024-003-BIT",
          strand: "TVL-IA",
          year: 1,
          email: "miguel.torres@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "9",
          name: "Isabella Ramos",
          studentId: "2024-004-BIT",
          strand: "STEM",
          year: 1,
          email: "isabella.ramos@ctu.edu.ph",
          status: "Active"
        }
      ]
    },
    {
      name: "Hospitality Management",
      code: "HM",
      students: [
        {
          id: "10",
          name: "Gabriel Cruz",
          studentId: "2023-005-HM",
          strand: "TVL-HE",
          year: 2,
          email: "gabriel.cruz@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "11",
          name: "Lucia Navarro",
          studentId: "2023-006-HM",
          strand: "TVL-HE",
          year: 2,
          email: "lucia.navarro@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "12",
          name: "Diego Morales",
          studentId: "2024-005-HM",
          strand: "ABM",
          year: 1,
          email: "diego.morales@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "13",
          name: "Carmen Diaz",
          studentId: "2024-006-HM",
          strand: "TVL-HE",
          year: 1,
          email: "carmen.diaz@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "14",
          name: "Antonio Silva",
          studentId: "2022-002-HM",
          strand: "HUMSS",
          year: 3,
          email: "antonio.silva@ctu.edu.ph",
          status: "Active"
        }
      ]
    },
    {
      name: "Tourism Management",
      code: "TOURISM",
      students: [
        {
          id: "15",
          name: "Elena Vargas",
          studentId: "2023-007-TOUR",
          strand: "ABM",
          year: 2,
          email: "elena.vargas@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "16",
          name: "Fernando Castro",
          studentId: "2023-008-TOUR",
          strand: "HUMSS",
          year: 2,
          email: "fernando.castro@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "17",
          name: "Gabriela Mendez",
          studentId: "2024-007-TOUR",
          strand: "ABM",
          year: 1,
          email: "gabriela.mendez@ctu.edu.ph",
          status: "Active"
        },
        {
          id: "18",
          name: "Ricardo Ortiz",
          studentId: "2024-008-TOUR",
          strand: "HUMSS",
          year: 1,
          email: "ricardo.ortiz@ctu.edu.ph",
          status: "Active"
        }
      ]
    }
  ];

  const toggleCourse = (courseCode: string) => {
    setExpandedCourse(expandedCourse === courseCode ? null : courseCode);
  };

  const getStrandColor = (strand: string) => {
    const colors: Record<string, string> = {
      "STEM": "bg-green-50 text-green-700 border-green-200",
      "ABM": "bg-yellow-50 text-yellow-700 border-yellow-200",
      "HUMSS": "bg-purple-50 text-purple-700 border-purple-200",
      "TVL-ICT": "bg-blue-50 text-blue-700 border-blue-200",
      "TVL-IA": "bg-orange-50 text-orange-700 border-orange-200",
      "TVL-HE": "bg-pink-50 text-pink-700 border-pink-200"
    };
    return colors[strand] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const filteredCourses = courses.map(course => ({
    ...course,
    students: course.students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.strand.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));

  const totalStudents = courses.reduce((acc, course) => acc + course.students.length, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1F2937] mb-1">Student Records</h1>
          <p className="text-sm text-[#6B7280]">View student information organized by course and strand</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-xl hover:shadow-md transition-all">
          <Download className="h-4 w-4" />
          <span className="text-sm font-medium">Export Records</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#DD7230] rounded-xl flex items-center justify-center shadow-2xs">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              <p className="text-xs text-gray-500">Total Students</p>
            </div>
          </div>
        </div>
        {courses.map((course) => (
          <div
            key={course.code}
            className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 hover:border-[#DD7230]/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-[#DD7230]/20">
                <Users className="h-6 w-6 text-[#DD7230]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#DD7230]">{course.students.length}</p>
                <p className="text-xs text-gray-500 font-medium">{course.code}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, ID, or strand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer">
            <Filter className="h-4 w-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Course Categories with Students */}
      <div className="space-y-4">
        {filteredCourses.map((course) => (
          <div key={course.code} className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
            {/* Course Header */}
            <button
              onClick={() => toggleCourse(course.code)}
              className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-gray-50/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {expandedCourse === course.code ? (
                  <ChevronDown className="h-5 w-5 text-[#DD7230]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
                <div className="text-left">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900">{course.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {course.code} • {course.students.length} Students Enrolled
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 bg-[#DD7230] text-white rounded-lg text-xs font-semibold shadow-2xs">
                  {course.students.length} Students
                </span>
              </div>
            </button>

            {/* Student List */}
            {expandedCourse === course.code && (
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Student ID</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Strand</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Year Level</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {course.students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 text-xs text-gray-900 font-semibold">{student.studentId}</td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-orange-100 text-[#DD7230] rounded-md flex items-center justify-center text-[10px] font-bold">
                                {student.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <span className="text-xs text-gray-900 font-medium">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${getStrandColor(student.strand)}`}>
                              {student.strand}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-gray-700">Year {student.year}</td>
                          <td className="px-6 py-3.5 text-xs text-gray-500">{student.email}</td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                                student.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {student.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <button
                              className="p-1.5 text-gray-400 hover:text-[#DD7230] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Strand Summary */}
                <div className="p-6 bg-[#F5F7FA] border-t border-[#E5E7EB]">
                  <h3 className="text-sm font-medium text-[#1F2937] mb-3">Strand Distribution:</h3>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(new Set(course.students.map(s => s.strand))).map(strand => {
                      const count = course.students.filter(s => s.strand === strand).length;
                      return (
                        <div
                          key={strand}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStrandColor(strand)}`}
                        >
                          <span className="text-sm font-medium">
                            {strand}: {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
        <h3 className="text-base font-semibold text-[#1F2937] mb-4">Senior High School Strand Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200">STEM</span>
            <span className="text-sm text-[#6B7280]">Science, Technology, Engineering, Mathematics</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium border border-yellow-200">ABM</span>
            <span className="text-sm text-[#6B7280]">Accountancy, Business, Management</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-200">HUMSS</span>
            <span className="text-sm text-[#6B7280]">Humanities and Social Sciences</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">TVL-ICT</span>
            <span className="text-sm text-[#6B7280]">Technical-Vocational-Livelihood ICT</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium border border-orange-200">TVL-IA</span>
            <span className="text-sm text-[#6B7280]">TVL Industrial Arts</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-lg text-xs font-medium border border-pink-200">TVL-HE</span>
            <span className="text-sm text-[#6B7280]">TVL Home Economics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
