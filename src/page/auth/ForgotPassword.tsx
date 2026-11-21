import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader } from "lucide-react";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { loginMutationFn, requestPasswordResetMutationFn, resetPasswordMutationFn } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { CustomError } from "@/types/custom-error.type";

const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email address") });
const resetSchema = z
  .object({
    otp: z.string().length(6, "Enter the 6-digit code from the email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

const ForgotPassword = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: searchParams.get("email") ?? "" },
  });
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", password: "", confirm: "" },
  });

  const request = useMutation({
    mutationFn: requestPasswordResetMutationFn,
    onSuccess: (_data, sentTo) => setEmail(sentTo),
    onError: (error: CustomError) => toast({ title: "Couldn't send a code", description: error.message, variant: "destructive" }),
  });

  const reset = useMutation({
    mutationFn: async (values: z.infer<typeof resetSchema>) => {
      await resetPasswordMutationFn({ email: email!, otp: values.otp, password: values.password });
      // Sign straight in with the new password
      await loginMutationFn({ email: email!, password: values.password });
    },
    onSuccess: async () => {
      toast({ title: "Password reset", description: "You're signed in with your new password." });
      await queryClient.refetchQueries({ queryKey: ["authUser"] });
      navigate("/", { replace: true });
    },
    onError: (error: CustomError) => {
      resetForm.setValue("otp", "");
      toast({ title: "Couldn't reset your password", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <Link to="/" className="flex items-center gap-2 self-center font-medium">
        <Logo />
        Team Task.
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{email ? "Choose a new password" : "Reset your password"}</CardTitle>
          <CardDescription>
            {email ? (
              <>
                Enter the code we sent to <span className="font-medium text-foreground">{email}</span>
              </>
            ) : (
              "We'll email you a 6-digit code."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!email ? (
            <Form {...emailForm}>
              <form key="email" className="grid gap-6" onSubmit={emailForm.handleSubmit((v) => request.mutate(v.email))}>
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="m@example.com" autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={request.isPending}>
                  {request.isPending && <Loader className="mr-2 animate-spin" />}
                  Send code
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form key="reset" className="grid gap-5" onSubmit={resetForm.handleSubmit((v) => reset.mutate(v))}>
                <FormField
                  control={resetForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel className="sr-only">Code</FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} autoFocus {...field}>
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
                <FormField
                  control={resetForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={reset.isPending}>
                  {reset.isPending && <Loader className="mr-2 animate-spin" />}
                  Reset password
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  disabled={request.isPending}
                  onClick={() => request.mutate(email, { onSuccess: () => toast({ title: "New code sent" }) })}
                >
                  Send a new code
                </Button>
              </form>
            </Form>
          )}
          <div className="mt-6 text-center text-sm">
            <Link to="/" className="underline underline-offset-4">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
