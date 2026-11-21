import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { resendVerificationCodeMutationFn, verifyEmailMutationFn } from "../../lib/api";
import { toast } from "../../hooks/use-toast";
import type { CustomError } from "@/types/custom-error.type";

const formSchema = z.object({
  otp: z.string().length(6, { message: "Enter the 6-digit code from the email." }),
});

const RESEND_COOLDOWN_S = 30;

interface VerifyEmailFormProps {
  email?: string;
}

const VerifyEmailForm = ({ email: emailProp }: VerifyEmailFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const email = emailProp || searchParams.get("email") || "";
  const urlCode = searchParams.get("token") || searchParams.get("otp");
  const returnUrl = searchParams.get("returnUrl");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const autoSubmitted = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: urlCode || "" },
  });

  const verify = useMutation({
    mutationFn: verifyEmailMutationFn,
    onSuccess: async () => {
      toast({ title: "Email verified", description: "You're signed in." });
      // Verifying signs the user in; load them, then the sign-in page forwards to the workspace
      await queryClient.refetchQueries({ queryKey: ["authUser"] });
      navigate(returnUrl ? decodeURIComponent(returnUrl) : "/", { replace: true });
    },
    onError: (error: CustomError) => {
      form.setValue("otp", "");
      const expired = error.errorCode === "OTP_EXPIRED" || error.errorCode === "TOO_MANY_ATTEMPTS";
      toast({
        title: expired ? "That code has expired" : "That code isn't right",
        description: expired ? "Send yourself a new code and try again." : error.message,
        variant: "destructive",
      });
    },
  });

  const resend = useMutation({
    mutationFn: resendVerificationCodeMutationFn,
    onSuccess: () => {
      setCooldown(RESEND_COOLDOWN_S);
      toast({ title: "New code sent", description: `Check ${email}.` });
    },
    onError: (error: CustomError) => toast({ title: "Couldn't send a code", description: error.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // A link with the code in it verifies straight away
  useEffect(() => {
    if (email && urlCode?.length === 6 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      verify.mutate({ email, otp: urlCode });
    }
  }, [email, urlCode, verify]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!email) {
      toast({ title: "Email is missing", description: "Sign up or sign in again to get a code.", variant: "destructive" });
      return;
    }
    verify.mutate({ email, otp: values.otp });
  };

  return (
    <div className="mx-auto flex h-screen w-full items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <CardHeader className="flex flex-col items-center text-center">
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to
            <br />
            <span className="font-bold text-primary">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col items-center gap-6">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormLabel className="sr-only">Verification code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        autoFocus
                        disabled={verify.isPending}
                        {...field}
                        onComplete={(otp: string) => email && verify.mutate({ email, otp })}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot key={i} index={i} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={verify.isPending}>
                {verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {verify.isPending ? "Verifying..." : "Verify email"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-sm text-muted-foreground">
            Didn't get it?{" "}
            <Button
              variant="link"
              className="h-auto p-0"
              disabled={!email || cooldown > 0 || resend.isPending}
              onClick={() => resend.mutate(email)}
            >
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Codes expire after 10 minutes.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailForm;
