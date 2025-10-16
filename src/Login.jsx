import React from 'react';

function Login() {
  const handleLogin = () => {
    window.open("http://localhost:4000/auth/google", "_self");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <button
        onClick={handleLogin}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Login with Google
      </button>
    </div>
  );
}

export default Login;
