# FDC3 Desktop Agent | Example Web Implementation | Client

## Usage

```typescript
import "@whitedog/fdc3-web-client";

window.fdc3.initialize().then(() => {
  const initialContext = window.fdc3.getInitialContext();

  window.fdc3.connect().then((channel) => {
    console.log(`Connected to ${channel}`);

    channel.addContextListener("fdc3.instrument", (context) => {
      console.log("Received fdc3.instrument context:", context);
    });
  });
});
```
