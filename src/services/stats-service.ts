import { apiFetch } from "@/lib/api-client";
import type { ApiStatsDashboard, StatsDashboardParams } from "@/types/stats";

export interface StatsService {
  getDashboard(params?: StatsDashboardParams): Promise<ApiStatsDashboard>;
}

export class RestStatsService implements StatsService {
  async getDashboard(
    params: StatsDashboardParams = {}
  ): Promise<ApiStatsDashboard> {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.granularity) query.set("granularity", params.granularity);
    if (params.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    return apiFetch<ApiStatsDashboard>(
      `/v1/admin/stats/dashboard${qs ? `?${qs}` : ""}`
    );
  }
}

export const statsService: StatsService = new RestStatsService();
