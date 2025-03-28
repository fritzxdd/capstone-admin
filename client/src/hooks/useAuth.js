import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling form state and validation
 * @param {Object} initialValues - Initial form values
 * @param {Function} validate - Validation function
 * @param {Function} onSubmit - Form submission handler
 * @returns {Object} Form state and handlers
 */
const useForm = (initialValues = {}, validate = () => ({}), onSubmit = () => {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set a single form value
  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    const inputValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: inputValue }));
  }, []);

  // Handle input blur (mark field as touched)
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    
    setTouched(allTouched);
    
    // Validate the form
    const validationErrors = validate(values);
    setErrors(validationErrors);
    
    // Check if valid
    const hasErrors = Object.keys(validationErrors).length > 0;
    setIsValid(!hasErrors);
    
    if (!hasErrors) {
      setIsSubmitting(true);
      onSubmit(values);
    }
  }, [values, validate, onSubmit]);

  // Update validation status whenever values or touched fields change
  useEffect(() => {
    // Only validate fields that have been touched
    const touchedFields = Object.keys(touched).filter(key => touched[key]);
    if (touchedFields.length > 0) {
      const validationErrors = validate(values);
      
      // Filter to only include errors for touched fields
      const touchedErrors = Object.entries(validationErrors)
        .filter(([key]) => touched[key])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
      
      setErrors(touchedErrors);
      setIsValid(Object.keys(touchedErrors).length === 0);
    }
  }, [values, touched, validate]);

  // Reset isSubmitting after submission completes
  useEffect(() => {
    if (isSubmitting) {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  // Update form if initialValues change
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    resetForm,
    setValues
  };
};

export default useForm;