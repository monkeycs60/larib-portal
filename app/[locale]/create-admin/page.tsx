"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminAction } from "./actions"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

const formSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string().min(8, "Confirmez votre mot de passe"),
  accessCode: z.string().min(1, "Code d'accès requis"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

export default function CreateAdminPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAccessCode, setShowAccessCode] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const { execute, isExecuting } = useAction(createAdminAction, {
    onSuccess: () => {
      toast.success("Compte administrateur créé avec succès !")
      reset()
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 1500)
    },
    onError: ({ error }) => {
      if (error.serverError?.includes("INVALID_ACCESS_CODE")) {
        setError("accessCode", { message: "Code d'accès invalide" })
      } else if (error.serverError?.includes("USER_ALREADY_EXISTS")) {
        setError("email", { message: "Un utilisateur avec cet email existe déjà" })
      } else {
        setError("root", { message: "Erreur lors de la création du compte" })
      }
    },
  })

  const onSubmit = (values: FormData) => {
    execute(values)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">
            Créer un compte administrateur
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Remplissez le formulaire pour créer votre compte admin
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode">Code d'accès</Label>
              <div className="relative">
                <Input
                  id="accessCode"
                  type={showAccessCode ? "text" : "password"}
                  placeholder="Code de sécurité"
                  {...register("accessCode")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessCode(!showAccessCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.accessCode && (
                <p className="text-sm text-destructive">{errors.accessCode.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.root.message}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isExecuting}
            >
              {isExecuting ? "Création en cours..." : "Créer le compte"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
