FROM denoland/deno:2.0.5

# The port that your application listens to.
EXPOSE 80

WORKDIR /app

# Prefer not to run as root.
USER deno

# Copy the source code into the container.
ADD . .

# Cache and compile the main app so it doesn't need to be compiled each startup/entry.
RUN deno cache mod.ts

# Run with environment variable and file read permissions.
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
