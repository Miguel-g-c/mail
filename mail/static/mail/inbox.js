document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');

  // Send email
  document.querySelector('#compose-form').addEventListener('submit', () => send_email());
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Get the mailbox emails
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    emails.forEach(email => {

      if (mailbox != 'sent') {
        email_card_title = email.sender;
      } else {
        recipients = email.recipients;
        if (recipients.length > 1) {
          email_card_title = recipients[0] + ', ...';
        } else {
          email_card_title = recipients[0]
        }
      }

      if (email.body.length > 50) {
        body_end = '...'
      } else {body_end = ''}

      const email_post = document.createElement('div');

      email_post.className = 'card';

      email_post.style.cursor = 'pointer';

      if (email.read) {
        email_post.style.backgroundColor = '#F0F0F5'
      };

      email_post.innerHTML = `<div class="card-body">
                                <div class="container-fluid">
                                  <div class="row">
                                    <div class="col">
                                      <h5 class="card-title">${email_card_title}</h5>
                                    </div>
                                    <div class="col">
                                      <p class="card-text font-weight-bold text-muted text-right">${email.subject}: </p>
                                    </div>
                                    <div class="col-auto">
                                      <p class="card-text">${email.body.slice(0, 50)}${body_end}</p>
                                    </div>
                                    <div class="col">
                                      <p class="card-text text-right">${email.timestamp}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>`;

      document.querySelector('#emails-view').appendChild(email_post);

      border_color = email_post.style.borderColor

      email_post.addEventListener('mouseover', () => {

        email_post.style.borderColor = '#6495ED';

      });

      email_post.addEventListener('mouseout', () => {

        email_post.style.borderColor = border_color;

      });

      email_post.addEventListener('click', () => view_email(email.id));

    });
  })
  .catch(error => console.log('Error:', error));
}

function view_email(email_id) {
  
  // Show the email view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  //Get the email from API
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {

    const email_view = document.querySelector('#email-view');

    email_view.innerHTML = '';

    email_view.className = 'card';

    email_view.innerHTML = `<div class="card-header">
                              <h5 style="display:inline">${email.subject}</h5>
                              <h7 class="text-muted text-right" style="display:inline">${email.timestamp}</h7>
                            </div>
                            <div class="card-body">
                              <h6 class="card-title">From: ${email.sender}</h6>
                              <h6 class="card-title">To: ${email.recipients}</h6>
                              <br>
                              <p class="card-text" style="white-space: pre-line">${email.body}</p>
                            </div>`;
    
    const user_email = document.getElementById('user_email').innerHTML;

    if (email.sender !== user_email) {
      recipients = email.sender;
    } else {recipients = email.recipients}

    // Reply button
    const button_reply = document.createElement('button');

    button_reply.className = 'btn btn-outline-primary';
    button_reply.innerText = 'Reply';
    button_reply.addEventListener('click', () => {
      reply_email(recipients, email.sender, email.subject, email.body, email.timestamp);
    });
    email_view.querySelector('.card-body').appendChild(button_reply);

    //Archive or Unarchive button
    if (email.sender !== user_email) {

      const button_archived = document.createElement('button');

      button_archived.className = 'btn btn-outline-secondary';

      if (email.archived) {
        button_archived.innerText = 'Unarchive';
      } else {button_archived.innerText = 'Archive'};

      button_archived.addEventListener('click', () => {
        email_archived(email.id, !email.archived);
        load_mailbox('inbox');
        location.reload();
      }); 

      email_view.querySelector('.card-body').appendChild(button_archived);

    };

  })
  .catch(error => console.log('Error:', error));

  //Put the email as read on server
  email_read(email_id);

}

function reply_email(recipients, sender, subject, body, timestamp) {

  compose_email();

  if (!/^Re:/.test(subject)) {
    subject = `Re: ${subject}`;
  };

  document.querySelector("#compose-recipients").value = recipients;
  document.querySelector("#compose-subject").value = subject;

  prefill_intro = `On ${timestamp} ${sender} wrote:`;
  prefill_line = '__________';

  for (const i of Array(prefill_intro.length).keys()) {
    prefill_line += '_'
  };
  
  prefill = `\n${prefill_line}\n${prefill_intro}\n\n${body}`;

  document.querySelector("#compose-body").value = prefill;
}

function email_read(email_id) {
  fetch(`/emails/${email_id}`, {
    method: "PUT",
    body: JSON.stringify({
      read: true,
    })
    ,
  })
  .catch(error => console.log('Error:', error));
}

function email_archived(email_id, is_archived) {
  fetch(`/emails/${email_id}`, {
    method: "PUT",
    body: JSON.stringify({
      archived: is_archived,
    })
    ,
  })
  .catch(error => console.log('Error:', error));
}

function send_email() {

  event.preventDefault();

  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients : recipients,
      subject : subject,
      body : body
    })
  })
  .then(response => response.json())
  .then(data => { 
    if (data['message']) {
      load_mailbox('sent');
    } else {
      alert(data['error']);
    }
  })
  .catch(error => console.log('Error:', error));

}