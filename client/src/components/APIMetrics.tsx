import { useQuery } from "@tanstack/react-query";
import { ApiStat } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useState, useEffect } from "react";

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function APIMetrics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeFrame, setTimeFrame] = useState("24h");
  
  const { data: apiStats, isLoading } = useQuery({
    queryKey: ["/api/metrics"],
    refetchInterval: 30000,
  });

  // Sample agent data - in a real app this would come from the API
  const agentData = [
    { name: "Default Agent", value: 65 },
    { name: "Customer Service", value: 25 },
    { name: "Sales Rep", value: 10 }
  ];
  
  // Sample time series data - in a real app this would come from the API
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  
  // Generate sample time series data for the charts
  useEffect(() => {
    const now = new Date();
    const data = [];
    
    // Generate data points based on selected time frame
    const hours = timeFrame === "24h" ? 24 : timeFrame === "7d" ? 168 : 720;
    const interval = timeFrame === "24h" ? 1 : timeFrame === "7d" ? 6 : 24;
    
    for (let i = hours; i >= 0; i -= interval) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        openai: Math.floor(Math.random() * 10) + 5,
        elevenlabs: Math.floor(Math.random() * 8) + 3,
        twilio: Math.floor(Math.random() * 3) + 1
      });
    }
    
    setTimeSeriesData(data);
  }, [timeFrame]);

  const defaultApiStats: ApiStat[] = [
    {
      service: "Twilio",
      metrics: {
        "Total Calls": "0",
        "Avg Duration": "0:00"
      }
    },
    {
      service: "OpenAI",
      metrics: {
        "API Calls": "0",
        "Avg Response": "0.0s"
      }
    },
    {
      service: "ElevenLabs",
      metrics: {
        "TTS Requests": "0",
        "Characters": "0k"
      }
    }
  ];

  const displayStats = apiStats || defaultApiStats;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>API Usage Analytics</CardTitle>
            <CardDescription>
              Monitor your API usage across all services
            </CardDescription>
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => setTimeFrame("24h")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                timeFrame === "24h" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              24h
            </button>
            <button 
              onClick={() => setTimeFrame("7d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                timeFrame === "7d" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              7d
            </button>
            <button 
              onClick={() => setTimeFrame("30d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                timeFrame === "30d" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              30d
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage-trends">Usage Trends</TabsTrigger>
            <TabsTrigger value="agent-breakdown">Agent Breakdown</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayStats.map((stat, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">{stat.service}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(stat.metrics).map(([key, value], i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-xs text-muted-foreground">{key}</p>
                            <p className="text-2xl font-bold">{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="usage-trends">
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Requests Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={timeSeriesData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="openai" 
                          name="OpenAI"
                          stroke="#8884d8" 
                          activeDot={{ r: 8 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="elevenlabs" 
                          name="ElevenLabs"
                          stroke="#82ca9d" 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="twilio" 
                          name="Twilio"
                          stroke="#ffc658" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Usage Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'API Usage',
                            OpenAI: parseInt(displayStats[1].metrics['API Calls']) || 0,
                            ElevenLabs: parseInt(displayStats[2].metrics['TTS Requests']) || 0,
                            Twilio: parseInt(displayStats[0].metrics['Total Calls']) || 0
                          }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="OpenAI" fill="#8884d8" />
                        <Bar dataKey="ElevenLabs" fill="#82ca9d" />
                        <Bar dataKey="Twilio" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="agent-breakdown">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usage by Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={agentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {agentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Agent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={[
                          { name: 'Default Agent', openai: 87, elevenlabs: 65, twilio: 45 },
                          { name: 'Customer Service', openai: 45, elevenlabs: 35, twilio: 28 },
                          { name: 'Sales Rep', openai: 32, elevenlabs: 26, twilio: 16 }
                        ]}
                        margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="openai" name="OpenAI" fill="#8884d8" />
                        <Bar dataKey="elevenlabs" name="ElevenLabs" fill="#82ca9d" />
                        <Bar dataKey="twilio" name="Twilio" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
