
  const validateInput = (fieldId, feedbackId, fieldName, spinnerId) => {
    const input = document.getElementById(fieldId);
    const feedback = document.getElementById(feedbackId);
    const spinner = document.getElementById(spinnerId);

    input.addEventListener('input', () => {
      const value = input.value.trim();

      feedback.textContent = '';
      if (value === '') {
        if (spinner) spinner.style.display = 'none';
        return;
      }
      
      
      if (spinner) spinner.style.display = 'inline-block';

      fetch(`/validate/?field=${fieldName}&value=${value}`)
        .then(response => response.json())
        .then(data => {
          if (data.exists) {
            feedback.textContent = `${fieldName.replace('_', ' ')} already in use.`;
            feedback.style.color = 'red';
          } else {
            feedback.textContent = `${fieldName.replace('_', ' ')} is available.`;
            feedback.style.color = 'green';
          }
        })
        .catch(err => {
          console.error('Validation error:', err);
        })
        .finally(() => {
        
          if (spinner) spinner.style.display = 'none';
        });
    });
  };

 
  validateInput('email', 'email-feedback', 'email', 'email-spinner');
  validateInput('phone', 'phone-feedback', 'phone_number', 'phone-spinner');
  validateInput('username', 'username-feedback', 'username', 'username-spinner');

