import { SystemResource } from "@/types";

interface SystemResourcesProps {
  resources?: SystemResource;
}

export default function SystemResources({ resources }: SystemResourcesProps) {
  // Default values if no resources provided
  const defaultResources = {
    cpu: 32,
    memory: {
      used: 248,
      total: 512
    },
    network: 1.2,
    uptime: "3d 4h 12m"
  };

  const { cpu, memory, network, uptime } = resources || defaultResources;
  const memoryPercentage = (memory?.used / memory?.total) * 100 || 48;
  
  return (
    <section className="bg-[#1A2736] rounded-lg shadow-lg p-5">
      <h2 className="text-lg font-medium text-white border-b border-gray-700 pb-3 mb-4 flex items-center">
        <span className="material-icons mr-2 text-[#3392C8]">memory</span>
        System Resources
      </h2>
      
      <div className="space-y-4">
        {/* CPU Usage */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm">CPU Usage</span>
            <span className="text-sm text-[#33C3BD]">{cpu}%</span>
          </div>
          <div className="w-full bg-[#121E2F] rounded-full h-2">
            <div className="bg-[#00B4AC] h-2 rounded-full" style={{ width: `${cpu}%` }}></div>
          </div>
        </div>
        
        {/* Memory Usage */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm">Memory</span>
            <span className="text-sm text-[#33C3BD]">{memory?.used}MB / {memory?.total}MB</span>
          </div>
          <div className="w-full bg-[#121E2F] rounded-full h-2">
            <div className="bg-[#00B4AC] h-2 rounded-full" style={{ width: `${memoryPercentage}%` }}></div>
          </div>
        </div>
        
        {/* Network Usage */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm">Network</span>
            <span className="text-sm text-[#33C3BD]">{network} MB/s</span>
          </div>
          <div className="w-full bg-[#121E2F] rounded-full h-2">
            <div className="bg-[#00B4AC] h-2 rounded-full" style={{ width: `${(network / 5) * 100}%` }}></div>
          </div>
        </div>
        
        {/* Uptime */}
        <div className="p-3 bg-[#121E2F] rounded-md flex justify-between">
          <span className="text-sm">Uptime</span>
          <span className="text-sm text-[#33C3BD]">{uptime}</span>
        </div>
      </div>
    </section>
  );
}
