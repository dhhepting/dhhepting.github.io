
ssh-keyscan -t ed25519 titan.cs.uregina.ca 2>/dev/null | tee /tmp/titan.key
ssh-keygen -lf /tmp/titan.key                       # fingerprint to verify
ssh hepting@titan.cs.uregina.ca 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'   # must match
