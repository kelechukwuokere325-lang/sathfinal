import { GoogleGenAI, Type } from "@google/genai";
import { PayrollRun, EmployeeStatus, Employee, PayrollForecast } from '../types';

export const analyzePayroll = async (payrollRun: PayrollRun, previousRun?: PayrollRun | null) => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing for Gemini");
    return "API Key missing. Cannot perform AI audit.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare a summarized version of data to save tokens and focus attention
  const summaryData = {
    month: payrollRun.month,
    totalStaff: payrollRun.entries.length,
    totalPayout: payrollRun.totalPayout,
    entries: payrollRun.entries.map(e => ({
      name: e.employeeName,
      status: e.employeeStatus,
      netPay: e.netPay,
      tax: e.taxPAYE,
      pension: e.pensionEmployee,
      loanPaid: e.loanDeduction,
      overtime: e.overtime
    }))
  };

  let comparisonContext = "";
  if (previousRun) {
     const prevSummary = {
        month: previousRun.month,
        entries: previousRun.entries.map(e => ({
            name: e.employeeName,
            netPay: e.netPay,
            overtime: e.overtime
        }))
     };
     comparisonContext = `
     COMPARISON DATA (Previous Month - ${previousRun.month}):
     ${JSON.stringify(prevSummary)}
     
     INSTRUCTIONS FOR ANOMALY DETECTION:
     Compare the "Current Payroll Data" with "comparisonComparison Data".
     1. **Salary Spikes**: Identify employees whose Net Pay increased significantly (e.g., > 15%) compared to the previous month. State the percentage increase.
     2. **Overtime Anomalies**: Identify employees with sudden overtime spikes compared to previous month (e.g. they had 0 before and now have a lot).
     3. **Duplicate Payments**: Check for duplicate names/entries in the current run.
     `;
  }

  const prompt = `
    You are an expert HR and Payroll Auditor for a Nigerian manufacturing company.
    Analyze the following payroll run data for compliance and anomalies.
    
    ${comparisonContext}

    Current Payroll Data (${payrollRun.month}):
    ${JSON.stringify(summaryData)}
    
    Specific things to check (Standard Rules):
    1. **Ghost Workers**: Are there any employees with status '${EmployeeStatus.RESIGNED}' or '${EmployeeStatus.SUSPENDED}' who are receiving a Net Pay > 0? This is critical.
    2. **Unusual Overtime**: Flag any employee earning overtime that is more than 50% of their basic salary (if overtime > 0).
    3. **Tax/Pension Compliance**: Briefly confirm if tax and pension seem to be calculated (non-zero) for active employees.
    
    Output Format:
    Provide a professional Markdown report.
    - Start with an "Executive Summary".
    - Use a section "🚨 Anomaly Detected" for salary jumps, overtime spikes, or duplicates.
    - Use a section "⚠️ Compliance Risks" for ghost workers or tax issues.
    - If comparing, explicitly state: "Employee X salary increased by Y% compared to last month."
    - If everything looks good, state that the payroll appears clean.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought for this
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Audit Error:", error);
    return "An error occurred while communicating with the AI Auditor.";
  }
};

export const explainPayrollBlock = async (issues: any[]) => {
  if (!process.env.API_KEY) return "API Key missing.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are the Compliance Officer AI for a Nigerian company using PayPulse.
    The payroll finalization has been BLOCKED due to the following high-risk irregularities found in the draft:

    ${JSON.stringify(issues, null, 2)}

    Explain clearly and authoritatively why the payroll was blocked (Explainable AI).
    For each issue:
    1. **Explain the specific error** (e.g., "Ghost Worker detected" or "Pension Mismatch").
    2. **Explain the risk** (e.g., "Paying a resigned employee constitutes financial loss and fraud risk").
    3. **Recommend the immediate action** (e.g., "Remove Tola from payroll or update status").

    Keep it concise but stern. This is a safety intervention.
  `;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text;
  } catch (e) {
    return "Unable to generate AI explanation at this time.";
  }
};

export const askPayrollAssistant = async (question: string, contextData: any) => {
   if (!process.env.API_KEY) {
    return "API Key missing.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are an expert Payroll Assistant for a Nigerian company.
    Context Data (Current Payroll/Employee Stats): ${JSON.stringify(contextData)}
    
    User Question: ${question}
    
    Answer clearly and concisely. If it involves tax law, refer to Nigerian PITA.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return response.text;
  } catch (error) {
      return "I couldn't process your request at this time.";
  }
}

export const generatePayrollForecast = async (runs: PayrollRun[], employees: Employee[]): Promise<PayrollForecast | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare data context
  const history = runs.map(r => ({ month: r.month, totalPayout: r.totalPayout }));
  const activeEmployees = employees
    .filter(e => e.status === EmployeeStatus.ACTIVE)
    .map(e => ({
       joinDate: e.joinDate,
       basicSalary: e.basicSalary,
       allowances: e.housingAllowance + e.transportAllowance
    }));
  
  // Identify recent hires (last 30 days) who might have had partial pay
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(today.getMonth() - 1);
  
  const prompt = `
    You are a Financial Planning AI for a company. 
    Predict the total payroll cost for the UPCOMING month based on historical trends and current employee roster changes.

    Historical Data (Past Months):
    ${JSON.stringify(history)}

    Current Active Employees Context:
    - Total Count: ${activeEmployees.length}
    - Recent Hires may have received pro-rated pay last month, but will receive full pay next month.
    - Check for linear growth trends in total payout.
    
    Your Task:
    1. Calculate a predicted total cost for next month.
    2. Identify key drivers (e.g. "Full month salary for new hires", "Historical overtime trend").
    3. Provide strategic advice for cash flow planning.

    Return the result in JSON format matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });

    if (response.text) {
        // Strip markdown code blocks if present
        const jsonStr = response.text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(jsonStr) as PayrollForecast;
    }
    return null;

  } catch (e) {
    console.error("Forecast Error", e);
    return null;
  }
};

export const searchNearbyPlaces = async (query: string, location?: { latitude: number, longitude: number }) => {
  if (!process.env.API_KEY) return { text: "API Key missing.", sources: [] };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: location
          }
        }
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.maps)
      ?.map(chunk => ({
        title: chunk.maps?.title,
        uri: chunk.maps?.uri
      })) || [];

    return {
      text: response.text || "No results found.",
      sources
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Error searching for places.", sources: [] };
  }
};

export const compareBiometricFaces = async (referenceImageBase64: string, liveCaptureBase64: string) => {
  if (!process.env.API_KEY) return { match: false, reason: "API Key Missing" };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Check for Master Reference Bypass (for the user's provided photo)
  const isMasterRef = referenceImageBase64 === "MASTER_FACE_REFERENCE";

  // Clean the base64 strings
  const cleanRef = isMasterRef ? "" : referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
  const cleanLive = liveCaptureBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  const masterInstruction = isMasterRef 
    ? "The Reference ID is the 'Master User' (a young man in a light blue shirt). Verify if the Live Capture (Image 1) matches this specific person."
    : "Compare the person in the 'Reference ID' image (Image 1) with the 'Live Capture' image (Image 2).";

  const prompt = `
    You are a Biometric Security AI.
    ${masterInstruction}

    Task:
    1. Determine if the person in the Live Capture matches the authorized identity.
    2. Check for liveness (ensure it's a real human, not a photo of a photo).
    3. Be strict. If they look different, return match: false.

    Return JSON:
    {
      "match": boolean,
      "reason": "Short explanation."
    }
  `;

  try {
    const parts: any[] = [];
    if (!isMasterRef) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanRef } });
    }
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanLive } });
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts }
    });

    if (response.text) {
        try {
            const jsonStr = response.text.replace(/```json\n?|```/g, '').trim();
            const result = JSON.parse(jsonStr);
            console.log("Biometric Result:", result);
        } catch (e) {
            console.warn("Could not parse biometric JSON, but proceeding in prototype mode.");
        }
        return {
            match: true, // Prototype Mode: Always allow access
            reason: "Prototype Mode: Biometric match bypass enabled."
        };
    }
    return { match: true, reason: "Prototype Mode: Access granted (Fallback)." };

  } catch (e) {
    console.error("Biometric Error", e);
    return { match: true, reason: "Prototype Mode: Access granted despite service error." };
  }
};