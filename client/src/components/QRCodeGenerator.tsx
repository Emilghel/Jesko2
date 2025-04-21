import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Download, Copy, ExternalLink, Share2, Printer, Settings2, Palette } from 'lucide-react';

interface QRCodeGeneratorProps {
  referralCode: string;
  referralLink?: string;
}

export default function QRCodeGenerator({ 
  referralCode, 
  referralLink = `${window.location.origin}/auth?ref=${referralCode}`
}: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const [qrSize, setQrSize] = useState<string>('200'); // QR code size in pixels
  const [qrColor, setQrColor] = useState<string>('#3B82F6'); // Default blue color
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');
  const [qrLogo, setQrLogo] = useState<boolean>(true); // Include logo in QR code
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg' | 'jpeg'>('png');
  const [customUrl, setCustomUrl] = useState<string>(referralLink);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  
  // Generate QR code 
  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      
      // Normally we would call an API endpoint to generate the QR code
      // For demo purposes, we're using a placeholder URL
      const apiUrl = 'https://api.qrserver.com/v1/create-qr-code/';
      const urlToEncode = encodeURIComponent(customUrl || referralLink);
      const size = parseInt(qrSize);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // We'll use a third-party service for demonstration
      // In a production app, we would integrate a proper QR code library
      const qrUrl = `${apiUrl}?data=${urlToEncode}&size=${size}x${size}&color=${qrColor.substring(1)}&bgcolor=${backgroundColor.substring(1)}`;
      
      setQrImageUrl(qrUrl);
      setIsGenerating(false);
      
      toast({
        title: "QR Code Generated",
        description: "Your referral QR code has been created successfully",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      setIsGenerating(false);
      
      toast({
        title: "Error Generating QR Code",
        description: "There was a problem creating your QR code. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Download QR code
  const downloadQRCode = () => {
    if (!qrImageUrl) {
      toast({
        title: "No QR Code Available",
        description: "Please generate a QR code first",
        variant: "destructive"
      });
      return;
    }
    
    // Create a temporary anchor and trigger download
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `referral-code-${referralCode}.${downloadFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: `Your QR code is being downloaded as ${downloadFormat.toUpperCase()}`,
    });
  };
  
  // Copy QR code as image to clipboard
  const copyQRToClipboard = async () => {
    if (!qrImageUrl) {
      toast({
        title: "No QR Code Available",
        description: "Please generate a QR code first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Fetch the image and convert to blob
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      toast({
        title: "Copied to Clipboard",
        description: "QR code image copied to clipboard successfully",
      });
    } catch (error) {
      console.error('Error copying QR code to clipboard:', error);
      
      // Fallback method: open in new tab
      toast({
        title: "Clipboard Access Denied",
        description: "QR code opened in new tab instead. Right-click to save.",
      });
      
      window.open(qrImageUrl, '_blank');
    }
  };
  
  // Share QR code
  const shareQRCode = async () => {
    if (!qrImageUrl) {
      toast({
        title: "No QR Code Available",
        description: "Please generate a QR code first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Referral QR Code',
          text: `Sign up using my referral code: ${referralCode}`,
          url: customUrl || referralLink
        });
        
        toast({
          title: "Shared Successfully",
          description: "Your referral link has been shared",
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        toast({
          title: "Share Not Supported",
          description: "Your browser doesn't support direct sharing. Try copying the link instead.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      
      toast({
        title: "Share Cancelled",
        description: "Sharing was cancelled or failed",
        variant: "destructive"
      });
    }
  };
  
  // Print QR code
  const printQRCode = () => {
    if (!qrImageUrl) {
      toast({
        title: "No QR Code Available",
        description: "Please generate a QR code first",
        variant: "destructive"
      });
      return;
    }
    
    // Create a new window with just the QR code for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Referral QR Code - ${referralCode}</title>
            <style>
              body {
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                flex-direction: column;
                font-family: Arial, sans-serif;
              }
              img {
                max-width: 90%;
                max-height: 80vh;
              }
              h2 {
                margin-top: 20px;
                color: #333;
              }
              p {
                color: #666;
              }
            </style>
          </head>
          <body>
            <img src="${qrImageUrl}" alt="Referral QR Code" />
            <h2>Referral Code: ${referralCode}</h2>
            <p>${customUrl || referralLink}</p>
            <script>
              // Auto print when loaded
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Card className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden"
          style={{ 
            background: 'rgba(20, 20, 30, 0.7)', 
            boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
          }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-opacity-20 mr-3" 
              style={{ 
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                animation: 'iconFloat 3s ease-in-out infinite',
                boxShadow: '0 0 15px 5px rgba(56, 189, 248, 0.3)'
              }}>
            <QrCode className="h-6 w-6 text-blue-400" />
          </div>
          <span>Referral QR Code Generator</span>
        </CardTitle>
        <CardDescription>
          Generate a QR code for your referral link to share with potential customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="bg-gray-900/80 border border-gray-700 mb-6">
            <TabsTrigger value="generate" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400">
              Generate
            </TabsTrigger>
            <TabsTrigger value="customize" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
              Customize
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Your Referral Link</label>
                  <div className="flex">
                    <Input
                      value={customUrl || referralLink}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="rounded-r-none bg-gray-800 border-gray-700"
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-l-none border-l-0 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      onClick={() => {
                        navigator.clipboard.writeText(customUrl || referralLink);
                        toast({
                          title: "Link Copied",
                          description: "Referral link copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Download Format</label>
                      <Select 
                        value={downloadFormat} 
                        onValueChange={(value) => setDownloadFormat(value as 'png' | 'svg' | 'jpeg')}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="png">PNG Image</SelectItem>
                          <SelectItem value="svg">SVG Vector</SelectItem>
                          <SelectItem value="jpeg">JPEG Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Size (pixels)</label>
                      <Select value={qrSize} onValueChange={setQrSize}>
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="150">Small (150px)</SelectItem>
                          <SelectItem value="200">Medium (200px)</SelectItem>
                          <SelectItem value="300">Large (300px)</SelectItem>
                          <SelectItem value="500">Extra Large (500px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={generateQRCode}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Generate QR Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div 
                ref={qrContainerRef}
                className="flex items-center justify-center rounded-lg border border-gray-700 p-4" 
                style={{ 
                  background: 'rgba(10, 10, 20, 0.5)',
                  minHeight: '250px'
                }}
              >
                {qrImageUrl ? (
                  <div className="text-center">
                    <div className="bg-white inline-block p-2 rounded-lg shadow-lg">
                      <img 
                        src={qrImageUrl} 
                        alt="Referral QR Code" 
                        className="mx-auto rounded"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Referral Code: {referralCode}</p>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <QrCode className="h-16 w-16 text-gray-600 mx-auto mb-4 opacity-40" />
                    <p className="text-gray-400">QR code preview will appear here</p>
                  </div>
                )}
              </div>
            </div>
            
            {qrImageUrl && (
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center bg-blue-900/20 border-blue-800/30 text-blue-400 hover:bg-blue-900/40"
                  onClick={downloadQRCode}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center bg-purple-900/20 border-purple-800/30 text-purple-400 hover:bg-purple-900/40"
                  onClick={copyQRToClipboard}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center bg-green-900/20 border-green-800/30 text-green-400 hover:bg-green-900/40"
                  onClick={shareQRCode}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center bg-amber-900/20 border-amber-800/30 text-amber-400 hover:bg-amber-900/40"
                  onClick={printQRCode}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center bg-gray-900/20 border-gray-800/30 text-gray-400 hover:bg-gray-900/40"
                  onClick={() => window.open(customUrl || referralLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Link
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="customize" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 flex items-center">
                      <Palette className="h-4 w-4 mr-2" />
                      QR Code Color
                    </label>
                    <div className="flex">
                      <div 
                        className="w-10 h-10 border border-gray-700 rounded-l-md flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: qrColor }}
                      />
                      <Input
                        type="color"
                        value={qrColor}
                        onChange={(e) => setQrColor(e.target.value)}
                        className="w-full h-10 p-0 border-l-0 rounded-l-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 flex items-center">
                      <Palette className="h-4 w-4 mr-2" />
                      Background Color
                    </label>
                    <div className="flex">
                      <div 
                        className="w-10 h-10 border border-gray-700 rounded-l-md flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: backgroundColor }}
                      />
                      <Input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-full h-10 p-0 border-l-0 rounded-l-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 flex items-center">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Advanced Options
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-logo"
                        checked={qrLogo}
                        onChange={(e) => setQrLogo(e.target.checked)}
                        className="rounded-sm border-gray-700 bg-gray-800"
                      />
                      <label htmlFor="include-logo" className="text-sm text-gray-300">
                        Include company logo in QR code center
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Note: Adding a logo may reduce QR code readability in some cases
                    </p>
                  </div>
                  
                  <Button 
                    onClick={generateQRCode} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? 'Applying Changes...' : 'Apply Changes'}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-gray-300">Color Presets</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { fg: '#3B82F6', bg: '#FFFFFF', name: 'Blue' },
                      { fg: '#10B981', bg: '#FFFFFF', name: 'Green' },
                      { fg: '#8B5CF6', bg: '#FFFFFF', name: 'Purple' },
                      { fg: '#EC4899', bg: '#FFFFFF', name: 'Pink' },
                      { fg: '#F59E0B', bg: '#FFFFFF', name: 'Amber' },
                      { fg: '#000000', bg: '#FFFFFF', name: 'Classic' }
                    ].map((preset, index) => (
                      <button
                        key={index}
                        className="p-2 border border-gray-700 rounded-md hover:border-gray-500 transition-colors"
                        onClick={() => {
                          setQrColor(preset.fg);
                          setBackgroundColor(preset.bg);
                        }}
                      >
                        <div 
                          className="w-full h-10 rounded-md mb-1"
                          style={{ backgroundColor: preset.fg }}
                        />
                        <span className="text-xs text-gray-300">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="rounded-md bg-blue-900/20 p-3 text-sm text-blue-300 border border-blue-800">
                  <h4 className="font-medium mb-2">QR Code Tips</h4>
                  <ul className="space-y-1 text-xs list-disc pl-4">
                    <li>Higher contrast between colors improves scan reliability</li>
                    <li>Avoid complex patterns that may reduce readability</li>
                    <li>Test your QR code on multiple devices before sharing</li>
                    <li>For printed QR codes, we recommend at least 300px size</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}