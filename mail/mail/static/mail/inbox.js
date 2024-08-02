document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email(
    recipients=false, subject=false, body=false
  ));

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(recipients=false, subject=false, body=false) {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#detail-view').style.display = 'none';

  let compose_subject = document.querySelector('#compose-subject');
  let compose_body = document.querySelector('#compose-body');
  let compose_recipients = document.querySelector('#compose-recipients');
  compose_recipients.value = '';
  compose_subject.value = '';
  compose_body.value = '';

  if (recipients) {
    compose_recipients.value = recipients;
  }
  if (subject) {
    compose_subject.value = subject;
  }
  if (body) {
    compose_body.value = body;
  }

  // Listen to submitting the form
  document.querySelector('#compose-form').addEventListener('submit', mySubmit);
  
    function mySubmit(event) {
      event.preventDefault();

    if (compose_recipients.value === '') {
      const element_warning = document.createElement('div');
      element_warning.innerHTML = 'Please specify the recipient';
      element_warning.classList.add('bg-warning');
      let compose_view = document.querySelector('#compose-view');
      compose_view.insertAdjacentElement('afterbegin', element_warning);

      let submitButton = document.querySelector('input[type="submit"]');
      submitButton.blur();
      return;
    }
    document.querySelector('#compose-form').removeEventListener('submit', mySubmit);
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
          recipients: compose_recipients.value,
          subject: compose_subject.value,
          body: compose_body.value
      })
    })
    .then(response => response.json())
    .then(result => {
      // Clear out composition fields
      compose_recipients.value = '';
      compose_subject.value = '';
      compose_body.value = '';
      load_mailbox('sent');
    });
  }
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#detail-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Get content
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
      // Print emails
      emails.forEach((mail) => {
        const element_div = document.createElement('div');
        element_div.classList.add('d-flex', 'row', 'border', 'rounded', 'my-pointer');
        element_div.setAttribute('id', mail.id);
        if (mail.read) {
          element_div.classList.add('gray_background');
        }
        const emails_view = document.querySelector('#emails-view');
        emails_view.insertAdjacentElement('beforeend', element_div);
        const col_sender = document.createElement('div');
        col_sender.classList.add('col', 'col-md-2');
        col_sender.innerHTML = mail.sender;
        element_div.insertAdjacentElement('afterbegin', col_sender);
        const col_subject = document.createElement('div');
        col_subject.classList.add('col');
        col_subject.innerHTML = mail.subject;
        element_div.insertAdjacentElement('beforeend', col_subject);
        const col_timestamp = document.createElement('div');
        col_timestamp.classList.add('ms-auto', 'pr-2');
        col_timestamp.innerHTML = mail.timestamp;
        element_div.insertAdjacentElement('beforeend', col_timestamp);

        element_div.addEventListener('click', (e) => {
          fetch(`/emails/${e.target.parentElement.id}`)
          .then(response => response.json())
          .then(email => {
              // Show full info about email
              showOneMail(email, mailbox);
          });
        })
      })

  });

  function showOneMail(email, mailbox) {
    document.querySelector('#detail-view').style.display = 'block';
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';

    // clear all elements that was created previously
    let detailView = document.querySelector('#detail-view');
    detailView.innerHTML = '';

    // create wrapper for all content in mail
    let divWrapper = document.createElement('div');
    // append to parent
    detailView.insertAdjacentElement('beforeend', divWrapper);

    // create element for 'from'
    let fromDiv = document.createElement('div');
    fromDiv.innerHTML = `<b>From:</b> ${email.sender}`
    divWrapper.insertAdjacentElement('beforeend', fromDiv);

    // create element for 'to'
    let toDiv = document.createElement('div');
    toDiv.innerHTML = `<b>To:</b> ${email.recipients}`;
    divWrapper.insertAdjacentElement('beforeend', toDiv);

    // create element for 'subject'
    let subjectDiv = document.createElement('div');
    subjectDiv.innerHTML = `<b>Subject:</b> ${email.subject}`;
    divWrapper.insertAdjacentElement('beforeend', subjectDiv);

    // create element for 'timestamp';
    let timeStampDiv = document.createElement('div');
    timeStampDiv.innerHTML = `<b>Timestamp:</b> ${email.timestamp}`;
    divWrapper.insertAdjacentElement('beforeend', timeStampDiv);

    // create button
    let replyBtn = document.createElement('button');
    replyBtn.classList.add('btn', 'btn-sm', 'btn-outline-primary');
    replyBtn.innerHTML = 'Reply';
    divWrapper.insertAdjacentElement('beforeend', replyBtn);

    // add HR
    let hr = document.createElement('hr');
    divWrapper.insertAdjacentElement('beforeend', hr);

    // add body
    let bodyMessage = document.createElement('p');
    bodyMessage.innerHTML = `${email.body}`;
    divWrapper.insertAdjacentElement('beforeend', bodyMessage);

    replyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      let reSubject = email.subject;
      if (!reSubject.includes('Re:')) {
        reSubject = 'Re: ' + email.subject;
      }
      let reBody = `\n \n \n \n \nOn ${email.timestamp} ${email.sender} wrote: ${email.body}`;
      compose_email(recipient=email.sender, subject=reSubject, body=reBody);
    })

    if (!email.archived && mailbox === 'inbox') {
      // add archive button
      let archiveBtn = document.createElement('button');
      archiveBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
      archiveBtn.innerHTML = 'Archive';
      divWrapper.insertAdjacentElement('beforeend', archiveBtn);
      archiveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fetch(`/emails/${email.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            archived: true
          })
        }).then(response => {
          if (response.status === 204) {
            load_mailbox('inbox');
          }
        })
      })
    } else if (email.archived && mailbox === 'archive') {
      // add unarchive button
      let unarchiveBtn = document.createElement('button');
      unarchiveBtn.classList.add('btn', 'btn-sm', 'btn-outline-success');
      unarchiveBtn.innerHTML = 'Unarchive';
      divWrapper.insertAdjacentElement('beforeend', unarchiveBtn);
      unarchiveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fetch(`/emails/${email.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            archived: false
          })
        }).then(response => {
          if (response.status === 204) {
            load_mailbox('inbox');
          }
        })
      })
    }


    // mark message read if the page is inbox
    if (!email.read && mailbox === 'inbox') {
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      })
    } 
  }
}