import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useRole() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const role = user?.role || "visor";

  return {
    user,
    role,
    isLoading,
    isAdmin: role === "admin",
    isCapturista: role === "capturista",
    isVisor: role === "visor",
    canWrite: role === "admin" || role === "capturista",
    canDelete: role === "admin",
  };
}