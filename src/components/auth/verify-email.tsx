/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Loader2 } from "lucide-react";
import { verifyEmailMutationFn } from "../../lib/api";
import { Button } from "../ui/button";
import { toast } from "../../hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  token: z
    .string()
    .length(6, { message: "Your one-time password must be 6 characters." }),
});

interface VerifyEmailFormProps {
  email?: string;
}

const VerifyEmailForm = ({ email: emailProp }: VerifyEmailFormProps) => {
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get("email");
  const urlToken = searchParams.get("token");
  const [verificationStatus, setVerificationStatus] = useState("pending");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: urlToken || "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: verifyEmailMutationFn,
    onSuccess: () => {
      setVerificationStatus("success");
      toast({
        title: "Success",
        description: "Your email has been successfully verified.",
        variant: "default",
      });
    },
    onError: (error) => {
      setVerificationStatus("error");
      const errorMessage =
        (error as any)?.response?.data?.message ||
        "An unexpected error occurred.";
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // If we have both email and token from the URL, automatically attempt verification
    if (urlEmail && urlToken) {
      mutate({ email: urlEmail, token: urlToken });
    }
  }, [urlEmail, urlToken, mutate]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const currentEmail = emailProp || urlEmail;
    if (!currentEmail) {
      toast({
        title: "Error",
        description: "Email is missing. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }
    mutate({ email: currentEmail, token: values.token });
  };

  const renderContent = () => {
    if (isPending) {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="text-xl font-bold">Verifying your email...</h2>
          <p className="text-sm text-muted-foreground">
            Please do not close this page.
          </p>
        </div>
      );
    }

    if (verificationStatus === "success") {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-bold text-green-500">Email Verified!</h2>
          <p className="text-sm text-muted-foreground">
            Your email has been verified successfully. You can now log in.
          </p>
          <Link to="/" className="w-full">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      );
    }

    if (verificationStatus === "error" || verificationStatus === "pending") {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-2/3 space-y-6"
            >
              <CardContent className="flex flex-col items-center">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>One-Time Password</FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>
            </form>
          </Form>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen w-full mx-auto justify-center items-center">
      <Card className="w-full max-w-md p-6">
        <CardHeader className="flex flex-col items-center text-center">
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            Please enter the 6-digit code sent to
            <br />
            <span className="font-bold text-primary">
              {emailProp || urlEmail}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailForm;
