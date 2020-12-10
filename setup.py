from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()


setup(name='semantic-markdown-converter',
      version='0.3.2',
      description='Streams folders with semantic markdown to neo4j.',
      long_description=long_description,
      long_description_content_type="text/markdown",
      url='https://github.com/HEmile/semantic-markdown-converter',
      packages=find_packages(),
      install_requires=['pyyaml', 'tqdm', 'py2neo', 'watchdog'],
      entry_points={
          'console_scripts': ['smdc=smdc.convert:main', 'smds=smdc.server:main']
      },
      classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
      ],
      author='Emile van Krieken',
      author_email='emilevankrieken@live.nl',
      license='MIT',
      zip_safe=False,
      python_requires='>=3.6',)