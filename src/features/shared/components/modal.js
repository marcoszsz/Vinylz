export class Modal {
  static create(title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${typeof content === 'string' ? content : ''}
        </div>
        ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
      </div>
    `;

    if (typeof content !== 'string') {
      modal.querySelector('.modal-body').appendChild(content);
    }

    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
    return modal;
  }

  static confirm(title, message, onConfirm, onCancel) {
    const footer = `
      <button class="btn btn-primary" id="confirmBtn">Confirmar</button>
      <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
    `;

    const modal = this.create(title, message, { footer });
    modal.querySelector('#confirmBtn').addEventListener('click', () => {
      onConfirm?.();
      modal.remove();
    });
    modal.querySelector('#cancelBtn').addEventListener('click', () => {
      onCancel?.();
      modal.remove();
    });
  }
}
