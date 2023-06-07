FROM almalinux:9

RUN dnf install -y ansible-core

LABEL ansible_execution_environment="podman run -it --rm \
-v /opt/playbooks:/opt/playbooks:Z \
-e ANSIBLE_NOCOLOR=True \
localhost/ansible_ee ansible-playbook"

#Build image:
# podman build -f ansible_ee.containerfile -t localhost/ansible_ee
