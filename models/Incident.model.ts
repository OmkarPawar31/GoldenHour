import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIncident extends Document {
  trackId: number;
  detectedAt: Date;
  zone: string;
  confidence: number;
  direction: string;
  route: string[];
  signalSwitches: {
    intersectionId: string;
    switchedAt: Date;
    revertedAt?: Date;
  }[];
  alertsSent: number;
  corridorClearedAt?: Date;
  timeSavedEstimate: number;
  mode: "vision" | "gps_fallback";
}

const IncidentSchema: Schema = new Schema(
  {
    trackId: { type: Number, required: true },
    detectedAt: { type: Date, required: true },
    zone: { type: String, required: true },
    confidence: { type: Number, required: true },
    direction: { type: String, required: true },
    route: [{ type: String }],
    signalSwitches: [
      {
        intersectionId: { type: String, required: true },
        switchedAt: { type: Date, required: true },
        revertedAt: { type: Date },
      },
    ],
    alertsSent: { type: Number, default: 0 },
    corridorClearedAt: { type: Date },
    timeSavedEstimate: { type: Number, default: 0 },
    mode: { type: String, enum: ["vision", "gps_fallback"], default: "vision" },
  },
  { timestamps: true }
);

export const Incident: Model<IIncident> =
  mongoose.models.Incident || mongoose.model<IIncident>("Incident", IncidentSchema);
