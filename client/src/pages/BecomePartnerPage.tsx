import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Redirect } from 'wouter';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, Coins, Users, ArrowRight } from 'lucide-react';

const partnerSchema = z.object({
  company_name: z.string().min(2, { message: 'Company name must be at least 2 characters' }).max(100),
  contact_name: z.string().min(2, { message: 'Contact name must be at least 2 characters' }),
  website: z.string().url({ message: 'Must be a valid URL' }).optional().or(z.literal('')),
  referral_method: z.enum(['social', 'website', 'direct', 'other']),
  referral_details: z.string().max(500).optional(),
  tax_id: z.string().optional().or(z.literal('')),
  payment_email: z.string().email({ message: 'Must be a valid email address' }),
  bio: z.string().max(500).optional(),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

export default function BecomePartnerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitComplete, setIsSubmitComplete] = useState(false);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      company_name: '',
      contact_name: user?.displayName || '',
      website: '',
      referral_method: 'social',
      referral_details: '',
      tax_id: '',
      payment_email: user?.email || '',
      bio: '',
      terms_accepted: false,
    },
  });

  const { mutate: applyForPartnership, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/partner/apply', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Application Submitted',
        description: 'Your partner application has been submitted for review. We will notify you once it\'s approved.',
      });
      setIsSubmitComplete(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Application Failed',
        description: error.message || 'There was an error submitting your application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PartnerFormValues) => {
    // Extract the data the API expects
    const apiData = {
      company_name: data.company_name,
      contact_name: data.contact_name,
      website: data.website || null,
      bio: data.bio || null,
      payment_info: {
        payment_email: data.payment_email,
        tax_id: data.tax_id || null,
        referral_method: data.referral_method,
        referral_details: data.referral_details || null
      }
    };
    
    applyForPartnership(apiData);
  };

  if (isSubmitComplete) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent mb-4">
            Become a Partner
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Join our partner program and earn commissions by referring new customers to our platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Coins className="h-5 w-5 mr-2 text-green-400" /> Commission Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">Earn up to 30% commission on every purchase your referrals make:</p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex justify-between">
                  <span>First purchase</span>
                  <span className="font-semibold text-green-400">30%</span>
                </li>
                <li className="flex justify-between">
                  <span>Recurring purchases</span>
                  <span className="font-semibold text-green-400">20%</span>
                </li>
                <li className="flex justify-between">
                  <span>Subscription plans</span>
                  <span className="font-semibold text-green-400">25%</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-400" /> How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 bg-blue-900/30 text-blue-400 h-6 w-6 rounded-full flex items-center justify-center text-sm">1</span>
                  <span>Apply to become a partner</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 bg-blue-900/30 text-blue-400 h-6 w-6 rounded-full flex items-center justify-center text-sm">2</span>
                  <span>Get approved and receive your unique referral code</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 bg-blue-900/30 text-blue-400 h-6 w-6 rounded-full flex items-center justify-center text-sm">3</span>
                  <span>Share your referral link with potential customers</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 bg-blue-900/30 text-blue-400 h-6 w-6 rounded-full flex items-center justify-center text-sm">4</span>
                  <span>Get paid for successful referrals</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-purple-400" /> Program Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 mt-1" />
                  <span>Monthly payments with no minimum threshold</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 mt-1" />
                  <span>Real-time tracking of referrals and commissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 mt-1" />
                  <span>Marketing materials and support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 mt-1" />
                  <span>Early access to new features and products</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Partner Application</CardTitle>
            <CardDescription>
              Fill out the form below to apply for our partner program. We'll review your application and get back to you shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company or Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company name" className="bg-gray-700 border-gray-600" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" className="bg-gray-700 border-gray-600" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-website.com" className="bg-gray-700 border-gray-600" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Bio (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of your company" className="bg-gray-700 border-gray-600" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="referral_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How will you refer customers?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="social" id="social" />
                            </FormControl>
                            <FormLabel htmlFor="social" className="font-normal cursor-pointer">
                              Social Media
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="website" id="website" />
                            </FormControl>
                            <FormLabel htmlFor="website" className="font-normal cursor-pointer">
                              My Website
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="direct" id="direct" />
                            </FormControl>
                            <FormLabel htmlFor="direct" className="font-normal cursor-pointer">
                              Direct Outreach
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="other" id="other" />
                            </FormControl>
                            <FormLabel htmlFor="other" className="font-normal cursor-pointer">
                              Other
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referral_details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tell us more about how you plan to promote us</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your promotion strategy, target audience, or any other relevant details..."
                          className="h-24 resize-none bg-gray-700 border-gray-600"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / VAT Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="For payment purposes" className="bg-gray-700 border-gray-600" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Email address for payments"
                            type="email"
                            className="bg-gray-700 border-gray-600"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>We'll use this email for payment notifications</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="terms_accepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-gray-700/50">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the Partner Program Terms and Conditions
                        </FormLabel>
                        <FormDescription>
                          By applying, you agree to our <a href="#" className="text-blue-400 underline">Partner Agreement</a> and <a href="#" className="text-blue-400 underline">Privacy Policy</a>.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Application
                    </>
                  ) : (
                    <>
                      Submit Application <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}