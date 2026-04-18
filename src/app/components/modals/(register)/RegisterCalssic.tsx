"use client";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import Input from "../../inputs/Input";
import PasswordHintsPanel from "../../inputs/PasswordHintsPanel";

interface RegisterCalssicProps {
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  isArabic: boolean;
  isLoading: boolean;
  passwordValue: string;
}

const RegisterCalssic = ({
  register,
  errors,
  isArabic,
  isLoading,
  passwordValue,
}: RegisterCalssicProps) => {
  return (
    <>
      <Input
        id="name"
        label={isArabic ? "الاسم" : "Name"}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        iconName="FaRegUser"
        inputDir={isArabic ? "rtl" : "ltr"}
        textAlign={isArabic ? "right" : "left"}
      />
      <Input
        id="email"
        label={isArabic ? "البريد الإلكتروني" : "Email"}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        type="email"
        iconName="MdOutlineAlternateEmail"
        inputDir="ltr"
        textAlign="left"
      />
      <Input
        id="password"
        label={isArabic ? "كلمة المرور" : "Password"}
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        iconName="MdOutlineLock"
        inputDir="ltr"
        textAlign="left"
        allowPasswordToggle
      />

      <PasswordHintsPanel value={passwordValue} />

      <Input
        id="confirmPassword"
        label={isArabic ? "تأكيد كلمة المرور" : "Confirm password"}
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        iconName="MdOutlineVerifiedUser"
        inputDir="ltr"
        textAlign="left"
        allowPasswordToggle
        registerOptions={{
          validate: (value, formValues) =>
            value === formValues.password ||
            (isArabic
              ? "تأكيد كلمة المرور غير مطابق"
              : "Passwords do not match"),
        }}
      />
    </>
  );
};

export default RegisterCalssic;
