export interface AnalysisResult {
    college_name: string;
    total_cost_of_attendance: number;
    direct_costs: {
        tuition: number;
        housing: number;
        fees: number;
    };
    grants_scholarships: {
        institutional_merit: number;
        pell_grant: number;
        state_grant: number;
        total_gift_aid: number;
    };
    loans: {
        federal_subsidized: number;
        federal_unsubsidized: number;
        parent_plus: number;
        private_loans: number;
    };
    work_study: number;
    net_price: number;
    out_of_pocket_payment: number;
    analysis: {
        debt_warning: "Low" | "Medium" | "High" | "Critical";
        value_score: number;
    };
}
