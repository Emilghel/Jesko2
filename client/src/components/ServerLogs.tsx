import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ServerLog } from "@/types";

export default function ServerLogs() {
  const [logLevel, setLogLevel] = useState<string>("all");
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const { data: logs, refetch, isLoading } = useQuery({
    queryKey: ["/api/logs", logLevel],
    refetchInterval: 5000,
  });

  // Scroll to the bottom of the logs container
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleRefresh = () => {
    refetch();
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLogLevel(e.target.value);
  };

  const getLogColorClass = (level: string) => {
    switch (level) {
      case "INFO":
        return "text-blue-300";
      case "WARNING":
        return "text-yellow-300";
      case "ERROR":
        return "text-red-300";
      default:
        return "text-green-300";
    }
  };

  return (
    <section className="bg-[#1A2736] rounded-lg shadow-lg p-5">
      <h2 className="text-lg font-medium text-white border-b border-gray-700 pb-3 mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons mr-2 text-[#3392C8]">format_align_left</span>
          Server Logs
        </div>
        <div className="flex space-x-2">
          <select 
            className="bg-[#121E2F] text-gray-300 px-2 py-1 rounded text-sm border border-gray-700"
            value={logLevel}
            onChange={handleLevelChange}
          >
            <option value="all">All Levels</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>
          <button 
            className="bg-[#005F95] hover:bg-[#0077BB] px-2 py-1 rounded text-sm"
            onClick={handleRefresh}
          >
            <span className="material-icons text-sm">refresh</span>
          </button>
        </div>
      </h2>
      
      <div className="bg-[#121E2F] p-4 rounded-md font-mono text-sm h-80 overflow-y-auto">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center text-gray-400">Loading logs...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center text-gray-400">No logs to display</div>
          ) : (
            logs.map((log: ServerLog, index: number) => (
              <div key={index} className={getLogColorClass(log.level)}>
                [{log.timestamp}] [{log.level}] {log.message}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </section>
  );
}
