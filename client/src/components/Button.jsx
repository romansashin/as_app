function Button({ variant = 'primary', children, className = '', ...props }) {
  const baseStyles = 'px-6 py-3 rounded-lg font-medium transition-colors duration-200';
  
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-accent',
    secondary: 'bg-secondary text-primary hover:bg-opacity-80',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;

