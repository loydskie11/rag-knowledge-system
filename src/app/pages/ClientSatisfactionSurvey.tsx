import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check
} from "lucide-react";
import { apiClient } from "../api/client";

// ==========================================
// SURVEY CONFIGURATION & QUESTION REPOSITORY
// ==========================================
const SURVEY_CONFIG = {
  regions: [
    "Region VII - Central Visayas",
    "Region I - Ilocos Region",
    "Region II - Cagayan Valley",
    "Region III - Central Luzon",
    "Region IV-A - CALABARZON",
    "MIMAROPA Region",
    "Region V - Bicol Region",
    "Region VI - Western Visayas",
    "Region VIII - Eastern Visayas",
    "Region IX - Zamboanga Peninsula",
    "Region X - Northern Mindanao",
    "Region XI - Davao Region",
    "Region XII - SOCCSKSARGEN",
    "Region XIII - Caraga",
    "NCR - National Capital Region",
    "CAR - Cordillera Administrative Region",
    "BARMM - Bangsamoro Autonomous Region in Muslim Mindanao"
  ],
  campuses: [
    "Argao Campus",
    "Oslob Campus",
    "San Fernando Campus",
    "Cebu City Main Campus",
    "Barili Campus",
    "Carmen Campus",
    "Danao Campus",
    "Moalboal Campus",
    "Tuburan Campus",
    "San Francisco Campus"
  ],
  services: [
    "Request and Issuances of Scholastic Records (TOR, Certificates, Grades, Diploma, Documents)",
    "Processing Financial Assistance",
    "Application (employment / admission)",
    "Payment / Cashiering",
    "Process related research paper documents",
    "Process scholarship documentary requirements",
    "Submit requirements / Clearance",
    "Consultation (clinic, health, guidance)",
    "Inquiries, complaints and assistance",
    "Request for issuance of Travel orders, application of leave, documents",
    "Request for livestreaming, photo documentation and news writing of university events and activities",
    "Process of salary claims, vouchers",
    "Receive Documents (for signature)",
    "Release documents (done signature)",
    "Visit office personnel",
    "Other"
  ],
  offices: [
    "CD Office (Campus Director)",
    "Accounting Office",
    "Budget / Finance Office",
    "Cashier's Office",
    "Civil Security Unit (CSU) Office",
    "Medical Clinic / Dental",
    "Admin Office",
    "CAS Office (College of Arts and Sciences)",
    "COTE Office (College of Technology and Engineering)",
    "COED Office (College of Education)",
    "CHTM Office (College of Hospitality and Tourism)",
    "CAF Office (College of Agriculture and Forestry)",
    "MIS Office / IT Center",
    "Guidance Office",
    "Graduate School Office",
    "Human Resource and Management Office",
    "Library Office",
    "Maintenance Office",
    "BAC Office (Bids & Awards)",
    "Public Assistance and Information Desk",
    "Registrar's Office",
    "Scholarship Office",
    "SAO / Dean of Student Affairs Office",
    "Supply Office",
    "GAD Office (Gender and Development)",
    "Planning & Development Office",
    "DOI Office (Director of Instruction)",
    "Other"
  ],
  ccQuestions: [
    {
      id: "cc1",
      title: "CC1. Awareness of Citizen's Charter (CC)",
      question: "Do you know about the Citizen's Charter (CC)? Nakahibalo ba ka bahin sa Citizen's Charter or CC?",
      options: [
        "Yes, I know and I saw this office's CC. (Kahibalo ko kung unsa ang CC ug nakita nako ang CC aning buhatan).",
        "Yes, I know but I did NOT see this office's CC. (Kahibalo ko kung unsa ang CC pero wala nako makita ang CC aning buhatan).",
        "No, and I only know about it when I saw this office's CC. (Nakahibalo ko sa CC lamang pagkakita nako sa CC aning buhatan.)",
        "No, I do not know and I did not see one in this office. (Wala ko kahibalo kung unsa ang CC ug wala ko makakita og usa dinhi sa buhatan)."
      ]
    },
    {
      id: "cc2",
      title: "CC2. Visibility of Citizen's Charter",
      question: "If YES to #1, did you see this office's Citizen's Charter? (Kung Yes, masulti ba nimo nga ang CC aning opisina kay...)",
      options: [
        "Yes, it was easy to see. (Sayon ra makita)",
        "Yes, somewhat easy to see. (Medjo sayon ra makita)",
        "No, it is difficult to see. (Lisod makita)",
        "No, it is not visible at all. (Wala gyud makita)",
        "Not Applicable (N/A). (Dili angay)"
      ]
    },
    {
      id: "cc3",
      title: "CC3. Helpfulness of Citizen's Charter",
      question: "If YES to #2, how much did the CC help you in your transaction? (Kung YES, giunsa ka pagtabang sa CC sa imong transaksyon?)",
      options: [
        "Yes, it helped me very much. (Dako kaayo'g natabang).",
        "Yes, it somewhat helped. (Medjo nakatabang).",
        "No, it did not help at all. (Wala gyud makatabang).",
        "Not Applicable (N/A). (Dili angay)"
      ]
    }
  ],
  sqdScale: [
    "Strongly Agree",
    "Agree",
    "Neither Agree nor Disagree",
    "Disagree",
    "Strongly Disagree",
    "Not Applicable (N/A)"
  ],
  sqdStatements: [
    { id: "sqd0", text: "SQD 0. I am satisfied with the service that was provided. (Kontento ko sa serbisyo nga gihatag)." },
    { id: "sqd1", text: "SQD 1. I spent a reasonable amount of time for my transaction. (Akong transaksyon nahuman sa hustong oras)." },
    { id: "sqd2", text: "SQD 2. The office followed the transaction's requirements and steps based on the information provided. (Gisunod sa opisina ang mga kinahanglanon ug mga pamaagi sa transaksyon sumala sa impormasyong gihatag.)" },
    { id: "sqd3", text: "SQD 3. The steps I needed to do for the transaction were easy and simple. (Sayon ug yano ra ang mga lakang nga akong gisunod aron makompleto ang transaksyon.)" },
    { id: "sqd4", text: "SQD 4. I easily found information about my transaction from the office or its website. (Sayon nako nakit-an ang impormasyon mahitungod sa akong transaksyon gikan sa buhatan o sa ilang website.)" },
    { id: "sqd5", text: "SQD 5. I paid a reasonable amount of fees for my transaction. (Makatarunganon ang kantidad sa bayad nga akong gibayran alang sa akong transaksyon.)" },
    { id: "sqd6", text: "SQD 6. I feel the office was fair to all or had no favoritism. (Gibati nako nga patas sa serbisyon ug walay pinalabi)." },
    { id: "sqd7", text: "SQD 7. The staff treated me courteously and were helpful. (Matinahuron ko nilang giatiman ug andam motabang)." },
    { id: "sqd8", text: "SQD 8. I got what I needed from the office, or if denied, was sufficiently provided an explanation. (Nakuha nako ang akong gikinahanglan sa opisina, o kung gi-deny, gipasabot ko sa rason.)" }
  ]
};

const STEPS_META = [
  { step: 0, label: "Overview" },
  { step: 1, label: "Consent" },
  { step: 2, label: "Demographics" },
  { step: 3, label: "Citizen's Charter" },
  { step: 4, label: "Quality Dimensions" },
  { step: 5, label: "Suggestions" }
];

export function ClientSatisfactionSurvey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    consent: "",
    client_type: "",
    date_of_service: new Date().toISOString().split("T")[0],
    gender: "",
    age: "",
    region: "Region VII - Central Visayas",
    service_availed: "",
    service_other: "",
    campus: "Argao Campus",
    office_visited: "",
    office_other: "",
    cc1: "",
    cc2: "",
    cc3: "",
    sqd0: "",
    sqd1: "",
    sqd2: "",
    sqd3: "",
    sqd4: "",
    sqd5: "",
    sqd6: "",
    sqd7: "",
    sqd8: "",
    suggestions: "",
    full_name: "",
    email: ""
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");

    if (invalidFields.includes(field)) {
      setInvalidFields((prev) => prev.filter((f) => f !== field));
    }
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const nextStep = () => {
    if (step === 1 && formData.consent !== "agree") {
      setError("You must agree to the data privacy and consent terms to proceed with the survey.");
      setInvalidFields(["consent"]);
      return;
    }

    if (step === 2) {
      const required = ["client_type", "date_of_service", "gender", "age", "region", "service_availed", "campus", "office_visited"];
      const missing = required.filter((f) => !formData[f as keyof typeof formData] || String(formData[f as keyof typeof formData]).trim() === "");
      const newFieldErrors: Record<string, string> = {};

      if (!formData.age) {
        newFieldErrors.age = "Age is required";
      } else {
        const ageNum = Number(formData.age);
        if (isNaN(ageNum) || !Number.isInteger(ageNum) || ageNum < 10 || ageNum > 120) {
          missing.push("age");
          newFieldErrors.age = "Please enter a realistic age between 10 and 120";
        }
      }

      if (!formData.date_of_service) {
        newFieldErrors.date_of_service = "Date of service is required";
      } else {
        const selectedDate = new Date(formData.date_of_service);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (isNaN(selectedDate.getTime()) || selectedDate > today) {
          missing.push("date_of_service");
          newFieldErrors.date_of_service = "Date of service cannot be in the future";
        }
      }

      if (formData.office_visited === "Other" && !formData.office_other.trim()) {
        missing.push("office_other");
        newFieldErrors.office_other = "Please specify the office visited";
      }

      if (formData.service_availed === "Other" && !formData.service_other.trim()) {
        missing.push("service_other");
        newFieldErrors.service_other = "Please specify the service availed";
      }

      if (missing.length > 0) {
        setError("Please complete the required fields highlighted below.");
        setInvalidFields(Array.from(new Set(missing)));
        setFieldErrors(newFieldErrors);
        return;
      }
    }

    if (step === 3) {
      const missingCc = ["cc1", "cc2", "cc3"].filter((f) => !formData[f as keyof typeof formData]);
      if (missingCc.length > 0) {
        setError("Please answer all Citizen's Charter questions before proceeding.");
        setInvalidFields(missingCc);
        return;
      }
    }

    if (step === 4) {
      const requiredSqd = ["sqd0", "sqd1", "sqd2", "sqd3", "sqd4", "sqd5", "sqd6", "sqd7", "sqd8"];
      const missingSqd = requiredSqd.filter((f) => !formData[f as keyof typeof formData]);
      if (missingSqd.length > 0) {
        setError("Please rate all 9 Service Quality Dimensions statements before proceeding.");
        setInvalidFields(missingSqd);
        return;
      }
    }

    setError("");
    setInvalidFields([]);
    setFieldErrors({});
    setStep((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
    setError("");
    setInvalidFields([]);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    if (formData.email && formData.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email.trim())) {
        setError("Please enter a valid email address or leave it blank.");
        setInvalidFields(["email"]);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        client_type: formData.client_type,
        date_of_service: formData.date_of_service,
        gender: formData.gender,
        age: formData.age ? parseInt(formData.age, 10) : null,
        region: formData.region,
        service_availed: formData.service_availed === "Other" ? formData.service_other : formData.service_availed,
        campus: formData.campus,
        office_visited: formData.office_visited === "Other" ? formData.office_other : formData.office_visited,
        office_other: formData.office_other,
        cc1: formData.cc1,
        cc2: formData.cc2,
        cc3: formData.cc3,
        sqd0: formData.sqd0,
        sqd1: formData.sqd1,
        sqd2: formData.sqd2,
        sqd3: formData.sqd3,
        sqd4: formData.sqd4,
        sqd5: formData.sqd5,
        sqd6: formData.sqd6,
        sqd7: formData.sqd7,
        sqd8: formData.sqd8,
        suggestions: formData.suggestions,
        full_name: formData.full_name,
        email: formData.email
      };

      await apiClient.post("/api/css-responses", payload);
      setStep(6);
    } catch (err: any) {
      console.error("Survey submission error:", err);
      setError(err.response?.data?.detail || "Failed to submit survey response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSurvey = () => {
    setFormData({
      consent: "",
      client_type: "",
      date_of_service: new Date().toISOString().split("T")[0],
      gender: "",
      age: "",
      region: "Region VII - Central Visayas",
      service_availed: "",
      service_other: "",
      campus: "Argao Campus",
      office_visited: "",
      office_other: "",
      cc1: "",
      cc2: "",
      cc3: "",
      sqd0: "",
      sqd1: "",
      sqd2: "",
      sqd3: "",
      sqd4: "",
      sqd5: "",
      sqd6: "",
      sqd7: "",
      sqd8: "",
      suggestions: "",
      full_name: "",
      email: ""
    });
    setStep(0);
    setError("");
    setInvalidFields([]);
    setFieldErrors({});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF4E5] border border-[#FFE0B2] flex items-center justify-center p-2 shrink-0">
            <img src="/ctu-logo.png" alt="CTU Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Client Satisfaction Measurement</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF4E5] text-[#DD7230] border border-[#FFE0B2]">
                Official Survey
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Cebu Technological University — Anti-Red Tape Authority (ARTA) & Institutional Quality Assurance
            </p>
          </div>
        </div>

        {/* Progress Stepper Bar (Steps 1 to 5) */}
        {step >= 1 && step <= 5 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>Step {step} of 5: {STEPS_META[step]?.label}</span>
              <span className="text-[#DD7230]">{Math.round((step / 5) * 100)}% Completed</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#DD7230] h-full transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700 leading-relaxed font-medium">{error}</p>
        </div>
      )}

      {/* =========================================================================
          STEP 0: WELCOME & OVERVIEW
          ========================================================================= */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Welcome to the CTU Client Satisfaction Survey
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              This Client Satisfaction Measurement (CSM) tracks the customer experience of services provided by Cebu Technological University. Your honest feedback helps us continuously improve delivery, transparency, and service efficiency in compliance with Republic Act No. 11032 (Ease of Doing Business and Efficient Government Service Delivery Act).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <h3 className="text-sm font-bold text-gray-900">1. Confidential</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Your personal responses are securely stored and protected under the Data Privacy Act.</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <h3 className="text-sm font-bold text-gray-900">2. Quick & Simple</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Takes less than 3 minutes to rate your service experience across offices.</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <h3 className="text-sm font-bold text-gray-900">3. Actionable</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Directly informs campus quality assurance audits and departmental accreditation.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2.5 bg-[#DD7230] text-white font-semibold text-sm rounded-xl hover:bg-[#c66224] transition-all shadow-2xs cursor-pointer active:scale-98"
            >
              Begin Survey
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 1: DATA PRIVACY & CONSENT
          ========================================================================= */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gray-900">Data Privacy Notice & Consent</h2>
            <p className="text-xs text-gray-500">Republic Act No. 10173 — Data Privacy Act of 2012</p>
          </div>

          <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              In accordance with the Data Privacy Act of 2012, all information collected through this survey will be used exclusively by Cebu Technological University for service improvement and statistical reporting.
            </p>
            <p>
              Your individual identity will remain anonymous unless you voluntarily provide your name and contact details for follow-up inquiries.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-sm font-bold text-gray-800">
              Do you consent to the collection and processing of your survey responses? <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: "agree", label: "Yes, I Agree (Uyon Ko)", desc: "Proceed with the satisfaction survey" },
                { value: "disagree", label: "No, I Disagree", desc: "Decline to provide feedback at this time" }
              ].map((opt) => {
                const isSelected = formData.consent === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleInputChange("consent", opt.value)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#DD7230] bg-[#FFF4E5] text-gray-900 ring-1 ring-[#DD7230]"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{opt.label}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-[#DD7230]" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={formData.consent !== "agree"}
              className="px-6 py-2.5 bg-[#DD7230] text-white font-semibold text-sm rounded-xl hover:bg-[#c66224] transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: DEMOGRAPHICS & SERVICE DETAILS
          ========================================================================= */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Client Demographics & Transaction Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">Please provide general information about your campus visit</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Client Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Client Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.client_type}
                onChange={(e) => handleInputChange("client_type", e.target.value)}
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Select Client Type</option>
                <option value="Citizen/Individual">Citizen / Individual (Student, Parent, Visitor)</option>
                <option value="Business">Business / Commercial Supplier</option>
                <option value="Government employee">Government Employee / Faculty / Staff</option>
              </select>
              {fieldErrors.client_type && <p className="text-xs text-rose-600 mt-1">{fieldErrors.client_type}</p>}
            </div>

            {/* Date of Service */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Date of Transaction <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date_of_service}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => handleInputChange("date_of_service", e.target.value)}
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
              />
              {fieldErrors.date_of_service && <p className="text-xs text-rose-600 mt-1">{fieldErrors.date_of_service}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Select Gender</option>
                <option value="Man">Man (Lalaki)</option>
                <option value="Woman">Woman (Babaye)</option>
                <option value="Other">Other / Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Age <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                placeholder="e.g. 21"
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all"
              />
              {fieldErrors.age && <p className="text-xs text-rose-600 mt-1">{fieldErrors.age}</p>}
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Region of Residence <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
              >
                {SURVEY_CONFIG.regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Campus */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                CTU Campus Visited <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.campus}
                onChange={(e) => handleInputChange("campus", e.target.value)}
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
              >
                {SURVEY_CONFIG.campuses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Office Visited */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Office / Department Visited <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.office_visited}
                onChange={(e) => handleInputChange("office_visited", e.target.value)}
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Select Office</option>
                {SURVEY_CONFIG.offices.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {formData.office_visited === "Other" && (
                <input
                  type="text"
                  value={formData.office_other}
                  onChange={(e) => handleInputChange("office_other", e.target.value)}
                  placeholder="Please specify office name"
                  className="mt-2 w-full py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              )}
            </div>

            {/* Service Availed */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Service Availed <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.service_availed}
                onChange={(e) => handleInputChange("service_availed", e.target.value)}
                className="w-full py-2.5 px-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Select Service Availed</option>
                {SURVEY_CONFIG.services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {formData.service_availed === "Other" && (
                <input
                  type="text"
                  value={formData.service_other}
                  onChange={(e) => handleInputChange("service_other", e.target.value)}
                  placeholder="Please specify service availed"
                  className="mt-2 w-full py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-[#DD7230] text-white font-semibold text-sm rounded-xl hover:bg-[#c66224] transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: CITIZEN'S CHARTER (CC1, CC2, CC3)
          ========================================================================= */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Citizen's Charter Questions</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              The Citizen's Charter is an official document outlining services, requirements, fees, and processing times.
            </p>
          </div>

          <div className="space-y-6">
            {SURVEY_CONFIG.ccQuestions.map((q) => {
              const selectedVal = formData[q.id as keyof typeof formData];
              const isInvalid = invalidFields.includes(q.id);

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isInvalid ? "border-rose-300 bg-rose-50/40" : "border-gray-200 bg-gray-50/50"
                  }`}
                >
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{q.title}</h3>
                  <p className="text-xs text-gray-600 mb-3">{q.question}</p>

                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const isOptionSelected = selectedVal === opt;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleInputChange(q.id, opt)}
                          className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${
                            isOptionSelected
                              ? "border-[#DD7230] bg-[#FFF4E5] text-gray-900 font-semibold ring-1 ring-[#DD7230]"
                              : "border-gray-200 bg-white hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <span className="leading-relaxed">{opt}</span>
                          {isOptionSelected && <CheckCircle2 className="h-4 w-4 text-[#DD7230] shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-[#DD7230] text-white font-semibold text-sm rounded-xl hover:bg-[#c66224] transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4: SERVICE QUALITY DIMENSIONS (SQD0 TO SQD8)
          ========================================================================= */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Service Quality Dimensions (SQD)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Please rate your level of agreement with each statement regarding your transaction.
            </p>
          </div>

          <div className="space-y-5">
            {SURVEY_CONFIG.sqdStatements.map((st) => {
              const selectedScore = formData[st.id as keyof typeof formData];
              const isInvalid = invalidFields.includes(st.id);

              return (
                <div
                  key={st.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isInvalid ? "border-rose-300 bg-rose-50/40" : "border-gray-200 bg-gray-50/50"
                  }`}
                >
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 leading-relaxed">
                    {st.text}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {SURVEY_CONFIG.sqdScale.map((scaleLabel) => {
                      const isSelected = selectedScore === scaleLabel;
                      return (
                        <button
                          key={scaleLabel}
                          type="button"
                          onClick={() => handleInputChange(st.id, scaleLabel)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[54px] ${
                            isSelected
                              ? "border-[#DD7230] bg-[#FFF4E5] text-[#DD7230] font-bold shadow-2xs ring-1 ring-[#DD7230]"
                              : "border-gray-200 bg-white hover:bg-gray-100 text-gray-600 text-[11px]"
                          }`}
                        >
                          <span className="text-[11px] leading-tight">{scaleLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-[#DD7230] text-white font-semibold text-sm rounded-xl hover:bg-[#c66224] transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 5: SUGGESTIONS & OPTIONAL CONTACT DETAILS
          ========================================================================= */}
      {step === 5 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Feedback, Recommendations & Contact Info</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Help us understand how we can serve you better in future transactions
            </p>
          </div>

          {/* Suggestions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Suggestions / Comments for Improvement (Optional)
            </label>
            <textarea
              rows={4}
              value={formData.suggestions}
              onChange={(e) => handleInputChange("suggestions", e.target.value)}
              placeholder="e.g. Prompt service from the staff; please consider adding more chairs in the waiting area..."
              className="w-full p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400 resize-none leading-relaxed"
            />
          </div>

          {/* Optional Contact Details */}
          <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Contact Information (Optional)</h3>
              <p className="text-xs text-gray-500">Provide your name or email if you wish to be contacted regarding your feedback</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="e.g. name@example.com"
                  className="w-full py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={prevStep}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#DD7230] text-white font-semibold text-sm rounded-xl hover:bg-[#c66224] transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 6: SUCCESS & CONFIRMATION
          ========================================================================= */}
      {step === 6 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-2xs text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
            <Check className="h-8 w-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Daghang Salamat! Thank you for your feedback!
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your response has been securely saved to the CTU Institutional Database. Your ratings help us continually enhance public service quality.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResetSurvey}
              className="px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-all shadow-2xs cursor-pointer"
            >
              Submit Another Response
            </button>
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="px-6 py-2.5 bg-[#DD7230] text-white hover:bg-[#c66224] rounded-xl text-sm font-semibold transition-all shadow-2xs cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
