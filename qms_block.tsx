                {isoSubTab === "qms" ? (
                  /* DIGITAL QMS OPPORTUNITIES & ACTION PLANS (MRC Form 6) */
                  <div className="p-6 space-y-6">
                    {/* Banner Header */}
                    <div className="bg-gradient-to-r from-[#1F2937] via-[#2A3647] to-[#1F2937] text-white p-6 rounded-2xl shadow-md border-l-4 border-l-[#FF9501] flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-5 w-5 text-[#FF9501]" />
                          <h2 className="text-xl font-bold">QMS Opportunities & Action Plans (MRC Form 6)</h2>
                        </div>
                        <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                          Digitized quality management action plan tracker aligned with ISO 9001:2015. Monitor process, people, and paper opportunities across campus offices with automated target date tracking.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowAddQmsModal(true)}
                        className="px-5 py-3 bg-[#FF9501] text-white hover:bg-[#D97E00] rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 active:scale-95 uppercase tracking-wider"
                      >
                        <Plus className="h-4 w-4" /> Create Action Plan
                      </button>
                    </div>

                    {/* Metric Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Opportunities</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{qmsActionPlans.length}</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Tracked in Form 6</p>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
                        <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">In Progress</p>
                        <h3 className="text-2xl font-bold text-blue-700 mt-1">{qmsActionPlans.filter(p => p.status === 'In Progress').length}</h3>
                        <p className="text-[11px] text-blue-600 mt-0.5">Active execution</p>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50/20 shadow-2xs">
                        <p className="text-[10px] font-extrabold text-[#006837] uppercase tracking-wider">Completed</p>
                        <h3 className="text-2xl font-bold text-[#006837] mt-1">{qmsActionPlans.filter(p => p.status === 'Completed').length}</h3>
                        <p className="text-[11px] text-[#006837] mt-0.5">Resolved & verified</p>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-2xs">
                        <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">Overdue / Action Needed</p>
                        <h3 className="text-2xl font-bold text-red-700 mt-1">{qmsActionPlans.filter(p => p.status === 'Overdue' || (p.status !== 'Completed' && new Date(p.target_date) < new Date())).length}</h3>
                        <p className="text-[11px] text-red-600 mt-0.5">Target date elapsed</p>
                      </div>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#FF9501]" />
                          <label className="text-xs font-bold text-gray-700 uppercase">Office:</label>
                          {isOfficeRestricted ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100/90 border border-[#FF9501]/40 rounded-lg text-xs font-bold text-[#D97E00] shadow-2xs max-w-full overflow-hidden" title={`Office Scope Locked to: ${userAdminOffice}`}>
                              <Lock className="h-3.5 w-3.5 text-[#FF9501] shrink-0" />
                              <span className="truncate max-w-[140px] sm:max-w-[200px] font-bold text-gray-900">{userAdminOffice}</span>
                              <span className="text-[9px] bg-[#FF9501] text-white px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0 whitespace-nowrap">Role-Locked</span>
                            </div>
                          ) : (
                            <select
                              value={qmsOfficeFilter}
                              onChange={(e) => setQmsOfficeFilter(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#FF9501] shadow-2xs cursor-pointer"
                            >
                              <option value="all">All ISO Offices (16 Offices)</option>
                              {ISO_OFFICES_16.map((off) => (
                                <option key={off} value={off}>{off}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-[#FF9501]" />
                          <label className="text-xs font-bold text-gray-700 uppercase">Category:</label>
                          <select
                            value={qmsTypeFilter}
                            onChange={(e) => setQmsTypeFilter(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#FF9501] shadow-2xs cursor-pointer"
                          >
                            <option value="all">All Types (Process/People/Paper)</option>
                            <option value="Process">Process</option>
                            <option value="People">People</option>
                            <option value="Paper">Paper</option>
                            <option value="Risk/Opportunity">Risk / Opportunity</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#FF9501]" />
                          <label className="text-xs font-bold text-gray-700 uppercase">Status:</label>
                          <select
                            value={qmsStatusFilter}
                            onChange={(e) => setQmsStatusFilter(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#FF9501] shadow-2xs cursor-pointer"
                          >
                            <option value="all">All Statuses</option>
                            <option value="Proposed">Proposed</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </div>

                        {/* QMS Search Bar Input */}
                        <div className="relative min-w-[200px] flex-1 max-w-xs">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            value={qmsSearchQuery}
                            onChange={(e) => setQmsSearchQuery(e.target.value)}
                            placeholder="Search process area, plan, or personnel..."
                            className="w-full pl-9 pr-7 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] shadow-2xs"
                          />
                          {qmsSearchQuery && (
                            <button onClick={() => setQmsSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 font-bold">
                        Showing {filteredQmsPlans.length} Action Plan(s)
                      </div>
                    </div>

                    {/* Action Plans List / Cards */}
                    {isLoadingQmsPlans ? (
                      <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FF9501]" /></div>
                    ) : filteredQmsPlans.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                        <Sparkles className="h-10 w-10 text-gray-300 mx-auto" />
                        <h4 className="font-bold text-gray-700">No Digital QMS Action Plans Found</h4>
                        <p className="text-xs text-gray-500">Try adjusting your search query or filters.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredQmsPlans
                          .map((plan) => {
                            const isOverdue = plan.status !== 'Completed' && new Date(plan.target_date) < new Date();
                            return (
                              <div key={plan.id} className={`bg-white border rounded-xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3 ${
                                isOverdue ? 'border-red-300 bg-red-50/10' : 'border-gray-200'
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 bg-orange-100 text-[#D97E00] text-[10px] font-bold uppercase rounded border border-[#FF9501]/30">
                                      {plan.auditee_office}
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded border border-blue-200">
                                      Area: {plan.process_area}
                                    </span>
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded border border-purple-200">
                                      {plan.opportunity_type}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Status Dropdown */}
                                    <select
                                      value={plan.status}
                                      onChange={(e) => handleQuickStatusChangeQms(plan.id, e.target.value)}
                                      className={`px-3 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${
                                        plan.status === 'Completed' ? 'bg-green-100 text-[#006837] border-green-200' :
                                        plan.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                        plan.status === 'Overdue' || isOverdue ? 'bg-red-100 text-red-700 border-red-200' :
                                        'bg-gray-100 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      <option value="Proposed">Proposed</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Overdue">Overdue</option>
                                    </select>

                                    {/* Edit & Delete Buttons */}
                                    <button
                                      onClick={() => { setEditingQmsPlan({ ...plan }); setShowEditQmsModal(true); }}
                                      className="p-1.5 text-gray-400 hover:text-[#FF9501] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                      title="Edit Action Plan"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => { setQmsPlanToDelete(plan); setShowDeleteQmsModal(true); }}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Action Plan"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <p className="font-bold text-gray-400 uppercase text-[10px] tracking-wider mb-1">Opportunity Identification (MRC Form 6)</p>
                                    <p className="text-gray-900 leading-relaxed font-medium">{plan.opportunity_description}</p>
                                  </div>

                                  <div className="bg-orange-50/40 p-3 rounded-lg border border-orange-100">
                                    <p className="font-bold text-[#D97E00] uppercase text-[10px] tracking-wider mb-1">Proposed Action Plan</p>
                                    <p className="text-gray-900 leading-relaxed font-medium">{plan.action_plan}</p>
                                  </div>
                                </div>

                                {/* Closeout Verification Loop Box */}
                                {(plan.status === 'Completed' || plan.actual_completion_date) && (
                                  <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Closeout Verification Loop</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setTargetQmsPlanForCloseout(plan);
                                          setCloseoutForm({
                                            actual_completion_date: plan.actual_completion_date || new Date().toISOString().split("T")[0],
                                            assessment_date: plan.assessment_date || new Date().toISOString().split("T")[0],
                                            assessment_notes: plan.assessment_notes || ""
                                          });
                                          setShowQmsCloseoutModal(true);
                                        }}
                                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                      >
                                        Edit Closeout Details
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <span className="text-gray-500 font-medium">Actual Completion Date: </span>
                                        <span className="font-bold text-gray-900">{plan.actual_completion_date || "Pending Record"}</span>
                                        {plan.actual_completion_date && (
                                          <span className={`ml-2 px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                                            new Date(plan.actual_completion_date) <= new Date(plan.target_date)
                                              ? "bg-green-100 text-[#006837] border-green-200"
                                              : "bg-amber-100 text-[#D97E00] border-amber-200"
                                          }`}>
                                            {new Date(plan.actual_completion_date) <= new Date(plan.target_date) ? "On Schedule" : "Delayed Closeout"}
                                          </span>
                                        )}
                                      </div>

                                      <div>
                                        <span className="text-gray-500 font-medium">Auditor Assessment Date: </span>
                                        <span className="font-bold text-gray-900">{plan.assessment_date || "Not Assessed"}</span>
                                      </div>
                                    </div>

                                    {plan.assessment_notes && (
                                      <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-xs text-gray-800">
                                        <span className="font-bold text-emerald-800 uppercase text-[10px] block mb-0.5">Auditor Verification Remarks:</span>
                                        <p className="italic text-gray-700">{plan.assessment_notes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Attached Proof / Evidence Section */}
                                <div className="bg-gray-50/80 border border-gray-200 p-3.5 rounded-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileCheck className="h-4 w-4 text-[#FF9501]" />
                                      <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                                        Execution Proof & Evidence ({plan.evidences ? plan.evidences.length : 0})
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (isOfficeRestricted && plan.auditee_office !== userAdminOffice) {
                                          showToast(`Audit Governance: You are assigned to "${userAdminOffice}". You cannot attach evidence for "${plan.auditee_office}" action plans.`, "warning");
                                          return;
                                        }
                                        setTargetQmsPlanForEvidence(plan);
                                        setQmsEvidenceDocName(`Execution Proof - ${plan.process_area}`);
                                        setShowQmsEvidenceUploadModal(true);
                                      }}
                                      className="px-3 py-1 bg-orange-50 text-[#D97E00] hover:bg-orange-100 border border-[#FF9501]/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                    >
                                      <Plus className="h-3.5 w-3.5" /> Attach Evidence
                                    </button>
                                  </div>

                                  {plan.evidences && plan.evidences.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                      {plan.evidences.map((ev: any) => (
                                        <div key={ev.id} className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center justify-between gap-2 shadow-2xs">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="h-4 w-4 text-[#FF9501] shrink-0" />
                                            <div className="min-w-0">
                                              <p className="font-bold text-gray-900 text-xs truncate" title={ev.document_name}>{ev.document_name}</p>
                                              <p className="text-[10px] text-gray-400">By {ev.uploaded_by}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <a
                                              href={ev.file_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="p-1 text-[#FF9501] hover:bg-orange-50 rounded cursor-pointer"
                                              title="View / Download File"
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                            </a>
                                            <button
                                              onClick={() => handleDeleteQmsEvidence(ev.id)}
                                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                              title="Delete Evidence"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-gray-400 italic">No evidence proof attached yet. Click "Attach Evidence" to upload execution documents.</p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                                  <div className="flex items-center gap-4">
                                    <span className="font-semibold">
                                      Personnel Responsible: <span className="font-bold text-gray-900">{plan.personnel_responsible}</span>
                                    </span>
                                    <span className="text-gray-400">|</span>
                                    <span>Created by: <span className="font-semibold text-gray-700">{plan.created_by}</span></span>
                                  </div>

                                  <div className="flex items-center gap-1.5 font-bold">
                                    <Calendar className="h-3.5 w-3.5 text-[#FF9501]" />
                                    <span>Target Date: </span>
                                    <span className={isOverdue ? 'text-red-600 font-extrabold' : 'text-gray-900'}>
                                      {plan.target_date} {isOverdue && '(OVERDUE)'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Clean Clauses Overview Grid */
                  <div className="p-6">
                    {isLoadingIso ? (
                      <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FF9501]" /></div>
                    ) : isoRequirements.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 font-medium">No ISO clauses loaded for this cycle.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {isoRequirements
                          .filter((req) => isoOfficeFilter === "all" || req.auditee_office === isoOfficeFilter)
                          .map((req, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setExpandedIsoClause(req)}
                              className="bg-white border border-gray-200 hover:border-[#FF9501] rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-orange-100 text-[#D97E00] text-[10px] font-bold uppercase rounded tracking-wider border border-[#FF9501]/30">
                                      {req.iso_clause}
                                    </span>
                                    <span className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
                                      req.risk_level === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                      {req.risk_level} Risk
                                    </span>
                                  </div>
                                  <div>
                                    {req.status === "Compliant" ? (
                                      <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-[#006837] text-[10px] font-bold rounded uppercase tracking-wider border border-green-200 shadow-sm">
                                        <Check className="h-3 w-3" /> Compliant
                                      </span>
                                    ) : req.status === "Pending" ? (
                                      <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-[#D97E00] text-[10px] font-bold rounded uppercase tracking-wider border border-orange-200 shadow-sm">
                                        <Clock className="h-3 w-3" /> Pending Review
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded uppercase tracking-wider border border-red-100 shadow-sm">
                                        <AlertCircle className="h-3 w-3" /> Not Compliant
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <h3 className="font-bold text-gray-900 text-base mt-2 group-hover:text-[#FF9501] transition-colors">{req.title}</h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{req.description}</p>
                                
                                <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600 font-medium">
                                  <Building className="h-3.5 w-3.5 text-[#FF9501] shrink-0" />
                                  <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded truncate" title={req.auditee_office}>
                                    Auditee: <span className="font-bold text-gray-900">{req.auditee_office}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                  <FileText className="h-4 w-4 text-[#FF9501]" />
                                  <span>{req.evidences ? req.evidences.length : 0} Evidence File(s)</span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs font-bold text-[#FF9501] group-hover:text-[#D97E00] uppercase tracking-wider">
                                  View Details <span className="transform transition-transform duration-300 group-hover:translate-x-1">ΓåÆ</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
