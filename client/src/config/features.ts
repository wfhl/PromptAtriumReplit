import { useQuery } from "@tanstack/react-query";

// Shape of the public platform features endpoint (`/api/features`).
export interface PlatformFeatures {
  marketplaceEnabled: boolean;
}

// Reads the marketplace on/off state from the server. The state lives in
// platform settings (DB) and is controlled by super admins from the admin
// dashboard. Defaults to OFF until the server reports it is enabled.
//
// Keep this in sync with the server flag of the same name.
export function useMarketplaceEnabled(): boolean {
  const { data } = useQuery<PlatformFeatures>({
    queryKey: ["/api/features"],
    staleTime: 60 * 1000,
  });
  return data?.marketplaceEnabled ?? false;
}
