"use client";

interface RegisterModalFooter {
  isArabic: boolean;
  toggle: () => void;
}

const RegisterModalFooter = ({ isArabic, toggle }: RegisterModalFooter) => {
  return (
    <div className="flex flex-col gap-2 mt-3 ">
      <hr />

      <div className="text-slate-600 dark:text-slate-200 text-center mt-1 font-light">
        <div className="justify-center flex flex-row -items-center gap-2">
          {isArabic ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
          <div
            onClick={toggle}
            className="hover:underline cursor-pointer text-sky-700 dark:text-sky-300"
          >
            {isArabic ? "تسجيل الدخول" : "Login"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModalFooter;
