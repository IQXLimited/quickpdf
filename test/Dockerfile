#
# STAGE 1: Use a slim, modern Debian base image.
#
FROM debian:bookworm-slim

# Set an environment variable to prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

#
# STAGE 2: Install Firefox and only its essential dependencies.
#
RUN apt-get update && \
    apt-get install -y \
    # Install Firefox ESR (Extended Support Release) - it's stable and ideal for servers.
    firefox-esr \
    # --no-install-recommends is crucial for keeping the size down.
    --no-install-recommends \
    # Add essential libraries for fonts, graphics, and sound that Firefox needs to run headless.
    libdbus-glib-1-2 \
    libgtk-3-0 \
    libasound2 \
    # Install a basic set of fonts for rendering web pages correctly.
    fonts-liberation \
    ca-certificates \
    #
    # Finally, clean up the apt cache to remove downloaded package files.
    # This MUST be in the same RUN command to be effective.
    #
    && rm -rf /var/lib/apt/lists/*

#
# STAGE 3: Add a non-root user for security. Running a browser as root is not recommended.
#
RUN groupadd -r pptruser && useradd -r -m -g pptruser -G audio,video pptruser
# Switch to the new user
USER pptruser

# Expose the remote debugging port
EXPOSE 3000

#
# STAGE 4: Set the default command to run Firefox with all our required arguments.
#
CMD [ "firefox-esr", "--headless", "--remote-debugging-port=3000", "--no-sandbox", "--disable-setuid-sandbox" ]