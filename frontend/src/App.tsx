import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import axios from "axios";
import "./App.css";

const queryClient = new QueryClient();
const api = axios.create({ baseURL: "http://localhost:8000" });

interface Health {
  app: string;
  version: string;
  status: string;
}

function HealthCheck() {
  const { data, isLoading, error } = useQuery<Health>({
    queryKey: ["health"],
    queryFn: async () => (await api.get<Health>("/")).data,
  });

  if (isLoading) return <p className="text-gray-400">Backend-Verbindung wird geprueft …</p>;
  if (error) return <p className="text-red-400">Backend nicht erreichbar.</p>;

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
      <p className="text-purple-300 font-medium">Backend laeuft</p>
      <p className="text-sm text-gray-400 mt-1">
        {data?.app} v{data?.version} — Status: {data?.status}
      </p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-gray-100 mb-2">cubetracker</h1>
          <p className="text-gray-400 mb-8">Speedcubing-Solve-Tracking, lokal.</p>
          <HealthCheck />
          <p className="text-sm text-gray-500 mt-8">
            Skeleton — Phase 1 MVP folgt (F1-F5).
          </p>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
