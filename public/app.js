const app = new Vue({
    el: '#app',
    data: {
      url: '',
      emojis: '',
      error: '',
      formVisible: true,
      created: null,
    },
    methods: {
      async createUrl() {
        this.error = '';
        const response = await fetch('/newURL', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            url: this.url,
            emojis: this.emojis || undefined,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          this.formVisible = false;
          this.created = `http://${result.domain}/${result.raw}`;
        } else if (response.status === 429) {
          this.error = 'You are sending too many requests. Try again in 30 seconds.';
        } else {
          const result = await response.json();
          this.error = result.message;
        }
      },
    },
  });